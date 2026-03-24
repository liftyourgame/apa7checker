/**
 * CSV export button.
 * Uses papaparse to serialise citations and bibliography into a single CSV
 * and triggers a browser download — entirely client-side, no server call.
 */
import Papa from 'papaparse';
import type { CheckResponse } from '../types/api';

interface Props {
  checkResponse: CheckResponse;
}

interface CsvRow {
  Type: string;
  Page: string;
  Text: string;
  Issue: string;
  Severity: string;
  SuggestedFix: string;
}

export function DownloadButton({ checkResponse }: Props) {
  const handleDownload = () => {
    const rows: CsvRow[] = [
      ...checkResponse.citations.map((c) => ({
        Type: 'Citation',
        Page: String(c.pageNumber),
        Text: c.citationText,
        Issue: c.issue,
        Severity: c.severity,
        SuggestedFix: '',
      })),
      ...checkResponse.bibliography.map((b) => ({
        Type: 'Bibliography',
        Page: '',
        Text: b.entryText,
        Issue: b.issue,
        Severity: b.severity,
        SuggestedFix: b.suggestedFix ?? '',
      })),
      ...checkResponse.crossReference.citationsWithoutReference.map((text) => ({
        Type: 'Cross-Reference',
        Page: '',
        Text: text,
        Issue: 'Citation has no matching bibliography entry',
        Severity: 'error',
        SuggestedFix: '',
      })),
      ...checkResponse.crossReference.referencesWithoutCitation.map((text) => ({
        Type: 'Cross-Reference',
        Page: '',
        Text: text,
        Issue: 'Reference entry is never cited in the document body',
        Severity: 'warning',
        SuggestedFix: '',
      })),
    ];

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'apa7-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
    >
      <span>⬇</span> Download CSV
    </button>
  );
}
