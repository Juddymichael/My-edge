import { ImportFileType } from '../../types/import';

export interface DetectionResult {
  fileType: ImportFileType;
  brokerDetected?: string;
  confidence: number;
  delimiter?: string;
  encoding?: string;
}

export interface IFileDetector {
  detect(file: { name: string; content?: string | ArrayBuffer; mimeType?: string }): Promise<DetectionResult>;
}

export class DefaultFileDetector implements IFileDetector {
  async detect(file: { name: string; content?: string | ArrayBuffer; mimeType?: string }): Promise<DetectionResult> {
    const filename = file.name.toLowerCase();

    if (filename.endsWith('.json')) {
      return { fileType: 'JSON', confidence: 1.0 };
    }

    if (filename.endsWith('.csv') || filename.endsWith('.tsv') || filename.endsWith('.txt')) {
      let delimiter = filename.endsWith('.tsv') ? '\t' : ',';
      if (typeof file.content === 'string') {
        const firstLine = file.content.split('\n')[0] || '';
        if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';
        if (firstLine.includes('\t')) delimiter = '\t';
        if (firstLine.includes('|')) delimiter = '|';
      }
      return { fileType: 'CSV', confidence: 0.95, delimiter };
    }

    if (filename.endsWith('.xlsx') || filename.endsWith('.xlsm') || filename.endsWith('.ods')) {
      return { fileType: 'XLSX', confidence: 0.95 };
    }

    if (filename.endsWith('.xls')) {
      return { fileType: 'XLS', confidence: 0.95 };
    }

    if (filename.endsWith('.docx') || filename.endsWith('.doc')) {
      return { fileType: 'DOCX', confidence: 0.95 };
    }

    if (filename.endsWith('.pdf')) {
      return { fileType: 'PDF', confidence: 0.95 };
    }

    return { fileType: 'MANUAL', confidence: 0.1 };
  }
}
