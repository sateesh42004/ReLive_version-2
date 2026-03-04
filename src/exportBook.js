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

export const exportBookPDF = async (MOODS, isExportingRecaps = false) => {
    const entriesObj = await getAllEntries();

    let sortedDates = [];
    if (isExportingRecaps) {
        sortedDates = Object.keys(entriesObj).filter(k => k.startsWith('recap_')).sort((a, b) => {
            const timeA = parseInt(a.split('_')[1] || 0);
            const timeB = parseInt(b.split('_')[1] || 0);
            return timeA - timeB;
        });
    } else {
        // Sort chronologically (oldest to newest), filtering out anything that isn't a date string
        sortedDates = Object.keys(entriesObj).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
    }

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
            for (const imageItem of data.images) {
                if (imgY > 180) {
                    // Add Page Number to left margin of CURRENT page before turning
                    doc.setFont('times', 'italic');
                    doc.setFontSize(9);
                    doc.setTextColor(150, 150, 150);
                    doc.text(String(doc.internal.getNumberOfPages()), 15, 200);

                    doc.addPage();
                    // Background - Soft parchment
                    doc.setFillColor(248, 244, 236);
                    doc.rect(0, 0, 148, 210, 'F');

                    // Spine Shadow (Left Page: deep shadow on the right side)
                    doc.setFillColor(235, 230, 220);
                    doc.rect(144, 0, 4, 210, 'F');
                    doc.setFillColor(240, 235, 225);
                    doc.rect(140, 0, 4, 210, 'F');
                    imgY = 20;
                }

                const imgUrl = typeof imageItem === 'object' ? imageItem.src : imageItem;
                const imgTitle = typeof imageItem === 'object' ? imageItem.title : '';

                // Fetch image data to embed and get natural dimensions
                const imgData = await new Promise(async (resolve) => {
                    const base64 = await getBase64ImageFromUrl(imgUrl);
                    if (!base64) return resolve(null);

                    const img = new Image();
                    img.onload = () => {
                        resolve({ base64, width: img.width, height: img.height });
                    };
                    img.onerror = () => resolve(null);
                    img.src = base64;
                });

                if (imgData) {
                    const { base64, width, height } = imgData;

                    // Calculate proportional height based on a fixed maxWidth of 100mm
                    const ratio = height / width;
                    const calculatedHeight = maxWidth * ratio;

                    // If a single image is extremely tall (e.g. panoramic vertical), cap it
                    const finalHeight = calculatedHeight > 140 ? 140 : calculatedHeight;
                    const finalWidth = calculatedHeight > 140 ? (140 / ratio) : maxWidth;

                    // Center the image if width was capped
                    const xOffset = margin + (maxWidth - finalWidth) / 2;

                    // Check if this specific sized image will overflow the page
                    if (imgY + finalHeight > 195) {
                        // Add Page Number to left margin of CURRENT page before turning
                        doc.setFont('times', 'italic');
                        doc.setFontSize(9);
                        doc.setTextColor(150, 150, 150);
                        doc.text(String(doc.internal.getNumberOfPages()), 15, 200);

                        doc.addPage();
                        // Background - Soft parchment
                        doc.setFillColor(248, 244, 236);
                        doc.rect(0, 0, 148, 210, 'F');

                        // Spine Shadow
                        doc.setFillColor(235, 230, 220);
                        doc.rect(144, 0, 4, 210, 'F');
                        doc.setFillColor(240, 235, 225);
                        doc.rect(140, 0, 4, 210, 'F');
                        imgY = 20;
                    }

                    // Draw Image using 'SLOW' for better quality rendering
                    doc.addImage(base64, 'JPEG', xOffset, imgY, finalWidth, finalHeight, undefined, 'SLOW');

                    // Draw a subtle border frame around the image for aesthetic
                    doc.setDrawColor(220, 210, 200);
                    doc.setLineWidth(1);
                    doc.rect(xOffset, imgY, finalWidth, finalHeight);

                    if (imgTitle) {
                        doc.setFont('times', 'italic');
                        doc.setFontSize(10);
                        doc.setTextColor(100, 100, 100);
                        doc.text(imgTitle, margin + maxWidth / 2, imgY + finalHeight + 5, { align: 'center' });
                        imgY += finalHeight + 15; // Set cursor below title
                    } else {
                        imgY += finalHeight + 10; // Set cursor below image with some padding
                    }
                }
            }

            // Add Page Number to left margin for the final image page
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

        // Header: Date or Title
        doc.setFont('times', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);

        if (isExportingRecaps) {
            const title = data.recapTitle || (data.text || '').split('\n')[0].substring(0, 30) || 'Previous Experience';
            doc.text(title, 15, 20);

            if (data.updatedAt) {
                const dateObj = new Date(data.updatedAt);
                const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                doc.setFont('times', 'italic');
                doc.setFontSize(9);
                doc.setTextColor(150, 150, 150);
                doc.text(dateStr, 15, 25);
            }
        } else {
            const [year, month, day] = dateKey.split('-');
            const dateObj = new Date(year, month - 1, day);
            const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
            doc.text(dateStr, 15, 20);
        }

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
    const filename = isExportingRecaps ? `ReLive_Experiences_${currentYear}.pdf` : `ReLive_Diary_${currentYear}.pdf`;
    doc.save(filename);
};
