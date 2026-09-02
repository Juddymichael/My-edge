import * as pdfjsLib from 'pdfjs-dist';
import { ITradeParser, ParseResult, RawParsedRow } from '../parser';
import { ImportFileType } from '../../../types/import';

// Configure worker safely
try {
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
} catch {
  // Ignore worker setting if in test or node environment
}

/**
 * Universal PDF Statement Parser.
 * Extracts trade tables and statement records from MT4/MT5, cTrader, prop firm, and broker PDFs.
 */
export class PdfTradeParser implements ITradeParser {
  readonly supportedType: ImportFileType = 'PDF';

  async parse(rawInput: string | ArrayBuffer, options?: Record<string, unknown>): Promise<ParseResult> {
    let data: Uint8Array;
    if (typeof rawInput === 'string') {
      const encoder = new TextEncoder();
      data = encoder.encode(rawInput);
    } else {
      data = new Uint8Array(rawInput);
    }

    try {
      const loadingTask = pdfjsLib.getDocument({
        data,
        useSystemFonts: true,
        disableFontFace: true,
      });

      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;
      const allTextLines: string[] = [];

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Group items by vertical Y coordinate with a tolerance to reconstruct table lines
        const items = textContent.items as { str: string; transform: number[] }[];
        const lineMap = new Map<number, { x: number; text: string }[]>();

        for (const item of items) {
          if (!item.str || !item.str.trim()) continue;
          const y = Math.round(item.transform[5]); // Y coordinate
          const x = Math.round(item.transform[4]); // X coordinate

          // Find existing line bucket within 3px tolerance
          let matchedY = y;
          for (const existingY of lineMap.keys()) {
            if (Math.abs(existingY - y) <= 4) {
              matchedY = existingY;
              break;
            }
          }

          if (!lineMap.has(matchedY)) {
            lineMap.set(matchedY, []);
          }
          lineMap.get(matchedY)!.push({ x, text: item.str });
        }

        // Sort lines from top (highest Y) to bottom
        const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);

        for (const y of sortedY) {
          const rowItems = lineMap.get(y)!;
          // Sort items by horizontal X position
          rowItems.sort((a, b) => a.x - b.x);
          const fullLine = rowItems.map((i) => i.text.trim()).join('   ');
          if (fullLine.trim()) {
            allTextLines.push(fullLine);
          }
        }
      }

      return this.parseExtractedPdfLines(allTextLines);
    } catch (err) {
      console.error('Failed to parse PDF document:', err);
      return {
        fileType: 'PDF',
        totalRawRows: 0,
        rows: [],
      };
    }
  }

  private parseExtractedPdfLines(lines: string[]): ParseResult {
    const rows: RawParsedRow[] = [];
    let rowNum = 1;

    // Look for lines that contain trade signatures:
    // Dates (2026.08.15 or 15/08/2026), Direction (buy/sell), Prices (1.0850), Profit numbers
    const tradeLinePattern = /(buy|sell|long|short)/i;

    for (const line of lines) {
      if (tradeLinePattern.test(line) && !line.toLowerCase().startsWith('type') && !line.toLowerCase().startsWith('summary')) {
        // Split on multiple spaces or tab characters
        const tokens = line.split(/\s{2,}|\t/).map((t) => t.trim()).filter(Boolean);
        
        if (tokens.length >= 4) {
          const rowData: Record<string, unknown> = {
            rawText: line,
          };

          tokens.forEach((token, idx) => {
            rowData[`col_${idx}`] = token;
          });

          rows.push({
            rowNumber: rowNum++,
            data: rowData,
            rawString: line,
          });
        }
      }
    }

    return {
      fileType: 'PDF',
      totalRawRows: rows.length,
      rows,
      metadata: {
        totalLinesExtracted: lines.length,
      },
    };
  }
}
