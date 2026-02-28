import { jsPDF } from "jspdf";
import { getAllEntries } from "./firebase/db";

// Helper to reliably load an image from remote URL to Base64
const getBase64ImageFromUrl = async (imageUrl) => {
    try {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error('Failed to load image for PDF:', imageUrl, e);
        return null;
    }
};

export const exportBookPDF = async (MOODS) => {
    const entriesObj = await getAllEntries();

    // Sort chronologically (oldest to newest)
    const sortedDates = Object.keys(entriesObj).sort();

    // Create new PDF Document
    // Using A5 dimensions for a realistic book feel
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a5' // 148 mm X 210 mm
    });

    let isFirstPage = true;

    for (const dateKey of sortedDates) {
        const data = entriesObj[dateKey];
        if (!data) continue;

        const hasImages = data.images && data.images.length > 0;

        // --- Left Page (Images/Media) ---
        if (hasImages) {
            if (!isFirstPage) {
                doc.addPage();
            }
            isFirstPage = false;

            // Background - Soft parchment
            doc.setFillColor(248, 244, 236);
            doc.rect(0, 0, 148, 210, 'F');

            // Spine Shadow (Left Page: deep shadow on the right side)
            doc.setFillColor(235, 230, 220);
            doc.rect(144, 0, 4, 210, 'F');
            doc.setFillColor(240, 235, 225);
            doc.rect(140, 0, 4, 210, 'F');

            let imgY = 20;
            const margin = 24;
            const maxWidth = 100; // 148 - 24 - 24
            for (const imgUrl of data.images) {
                if (imgY > 180) break; // Arbitrary limit per page

                // Fetch image data to embed
                const base64 = await getBase64ImageFromUrl(imgUrl);
                if (base64) {
                    // Quick way to draw. In production, aspect ratio calculations are best.
                    doc.addImage(base64, 'JPEG', margin, imgY, maxWidth, 75, undefined, 'FAST');

                    // Draw a subtle border frame around the image for aesthetic
                    doc.setDrawColor(220, 210, 200);
                    doc.setLineWidth(1);
                    doc.rect(margin, imgY, maxWidth, 75);

                    imgY += 85;
                }
            }

            // Add Page Number to left margin
            doc.setFont('times', 'italic');
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text(String(doc.internal.getNumberOfPages()), 15, 200);
        }

        // --- Right Page (Text Content) ---
        if (!isFirstPage) {
            doc.addPage();
        }
        isFirstPage = false;

        // Background - Soft parchment
        doc.setFillColor(248, 244, 236);
        doc.rect(0, 0, 148, 210, 'F');

        // Spine Shadow (Right Page: shadow on the left side)
        doc.setFillColor(235, 230, 220);
        doc.rect(0, 0, 4, 210, 'F');
        doc.setFillColor(240, 235, 225);
        doc.rect(4, 0, 4, 210, 'F');

        // Header: Date
        doc.setFont('times', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);

        const [year, month, day] = dateKey.split('-');
        const dateObj = new Date(year, month - 1, day);
        const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        doc.text(dateStr, 15, 20);

        // Sub-Header: Favorite and Mood
        let headerRightX = 135;
        if (data.isFavorite) {
            doc.setTextColor(218, 165, 32); // Vintage Gold
            doc.text('★', headerRightX, 20);
            headerRightX -= 8;
        }
        if (data.mood && MOODS) {
            const moodObj = MOODS.find(m => m.val === data.mood);
            if (moodObj) {
                // PDF Emoji Support is tricky depending on font, so text fallback might run as square
                // But let's try pushing the unicode character or just text representation if needed
                doc.setTextColor(150, 140, 130);
                doc.setFont('times', 'normal');
                doc.setFontSize(12);
                doc.text(moodObj.icon, headerRightX, 20);
            }
        }

        // Draw a delicate line divider under header
        doc.setDrawColor(200, 190, 180);
        doc.setLineWidth(0.3);
        doc.line(15, 24, 135, 24);

        // Text Body
        let curY = 32;
        doc.setFont('times', 'normal');
        doc.setFontSize(10.5); // Matches readable book font
        doc.setTextColor(44, 30, 21); // Dark charcoal ink

        const textLines = doc.splitTextToSize(data.text || '', 118); // 148 - 15 - 15

        // Handle physical line flow
        for (let i = 0; i < textLines.length; i++) {
            if (curY > 190) { // Time to spawn a new right page
                doc.addPage();
                doc.setFillColor(248, 244, 236);
                doc.rect(0, 0, 148, 210, 'F');
                doc.setFillColor(235, 230, 220);
                doc.rect(0, 0, 4, 210, 'F');
                doc.setFillColor(240, 235, 225);
                doc.rect(4, 0, 4, 210, 'F');
                curY = 20; // reset to top
            }
            doc.text(textLines[i], 15, curY);
            curY += 5.5; // Custom leading / Line height for readability (~1.7)
        }

        curY += 4;

        // Tags
        if (data.tags && data.tags.length > 0) {
            if (curY > 195) {
                doc.addPage();
                doc.setFillColor(248, 244, 236); doc.rect(0, 0, 148, 210, 'F');
                doc.setFillColor(235, 230, 220); doc.rect(0, 0, 4, 210, 'F');
                doc.setFillColor(240, 235, 225); doc.rect(4, 0, 4, 210, 'F');
                curY = 20;
            }
            doc.setFont('times', 'italic');
            doc.setFontSize(9);
            doc.setTextColor(140, 130, 120);
            const tagStr = data.tags.map(t => '#' + t).join('   ');
            const tagLines = doc.splitTextToSize(tagStr, 118);
            doc.text(tagLines, 15, curY);
            curY += tagLines.length * 5 + 6;
        }

        // Audio Transcriptions
        if (data.audioNotes && data.audioNotes.length > 0) {
            for (const note of data.audioNotes) {
                if (typeof note === 'object' && note.transcription) {
                    if (curY > 185) {
                        doc.addPage();
                        doc.setFillColor(248, 244, 236); doc.rect(0, 0, 148, 210, 'F');
                        doc.setFillColor(235, 230, 220); doc.rect(0, 0, 4, 210, 'F');
                        doc.setFillColor(240, 235, 225); doc.rect(4, 0, 4, 210, 'F');
                        curY = 20;
                    }

                    // Transcription Box / Margin Note Style
                    doc.setFont('times', 'bold');
                    doc.setFontSize(7.5);
                    doc.setTextColor(160, 150, 140);
                    doc.text("AI TRANSCRIPTION", 15, curY);
                    curY += 4;

                    doc.setFont('times', 'italic');
                    doc.setFontSize(9.5);
                    doc.setTextColor(60, 50, 40);
                    const tLines = doc.splitTextToSize(note.transcription, 110);

                    // Indentation line simulating margin note boundary
                    doc.setDrawColor(197, 160, 101); // Muted gold
                    doc.setLineWidth(0.5);
                    doc.line(13, curY - 3, 13, curY + (tLines.length * 4.8));

                    doc.text(tLines, 15, curY);
                    curY += (tLines.length * 4.8) + 8;
                }
            }
        }

        // Add Page Number to right margin
        doc.setFont('times', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(String(doc.internal.getNumberOfPages()), 130, 200);
    } // End of outer dates loop

    // Save PDF using File Naming Convention
    const currentYear = new Date().getFullYear();
    doc.save(`ReLive_Diary_${currentYear}.pdf`);
};
