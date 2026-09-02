import { ITradeParser, ParseResult, RawParsedRow } from '../parser';
import { ImportFileType } from '../../../types/import';

/**
 * Universal JSON Parser for backups and array of trade objects.
 */
export class JsonTradeParser implements ITradeParser {
  readonly supportedType: ImportFileType = 'JSON';

  async parse(rawInput: string | ArrayBuffer): Promise<ParseResult> {
    let text: string;
    if (typeof rawInput === 'string') {
      text = rawInput;
    } else {
      const decoder = new TextDecoder('utf-8');
      text = decoder.decode(rawInput);
    }

    try {
      const parsed = JSON.parse(text);
      let tradeArray: unknown[] = [];

      if (Array.isArray(parsed)) {
        tradeArray = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray((parsed as { trades?: unknown[] }).trades)) {
          tradeArray = (parsed as { trades: unknown[] }).trades;
        } else if (Array.isArray((parsed as { data?: unknown[] }).data)) {
          tradeArray = (parsed as { data: unknown[] }).data;
        }
      }

      const rows: RawParsedRow[] = tradeArray.map((item, idx) => ({
        rowNumber: idx + 1,
        data: item as Record<string, unknown>,
        rawString: JSON.stringify(item),
      }));

      return {
        fileType: 'JSON',
        totalRawRows: rows.length,
        rows,
      };
    } catch (err) {
      console.error('Failed to parse JSON trade document:', err);
      return {
        fileType: 'JSON',
        totalRawRows: 0,
        rows: [],
      };
    }
  }
}
