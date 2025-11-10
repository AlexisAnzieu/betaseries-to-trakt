import Papa from "papaparse";
import type { ParseResult } from "papaparse";
import type { MovieCsvRow, ShowCsvRow } from "./types";

interface CsvParseOptions<T> {
  file: File;
  map: (row: Record<string, unknown>) => T | null;
}

const trimValue = (value: unknown) =>
  typeof value === "string" ? value.trim() : value;

const parseCsv = async <T>({ file, map }: CsvParseOptions<T>): Promise<T[]> =>
  new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: ParseResult<Record<string, unknown>>) => {
        if (results.errors.length) {
          reject(new Error(results.errors[0].message));
          return;
        }

        const rows: T[] = [];
        for (const rawRow of results.data) {
          const mapped = map(rawRow);
          if (mapped) {
            rows.push(mapped);
          }
        }

        resolve(rows);
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });

export const parseShowCsv = async (file: File) =>
  parseCsv<ShowCsvRow>({
    file,
    map: (row) => {
      const id = trimValue(row.id);
      const title = trimValue(row.title);

      if (!id || !title) {
        return null;
      }

      return {
        id: String(id),
        title: String(title),
        archive: row.archive ? String(trimValue(row.archive)) : undefined,
        episode: row.episode ? String(trimValue(row.episode)) : undefined,
        remaining: row.remaining ? String(trimValue(row.remaining)) : undefined,
        status: row.status ? String(trimValue(row.status)) : undefined,
        tags: row.tags ? String(trimValue(row.tags)) : undefined,
      };
    },
  });

export const parseMovieCsv = async (file: File) =>
  parseCsv<MovieCsvRow>({
    file,
    map: (row) => {
      const id = trimValue(row.id);
      const title = trimValue(row.title);

      if (!id || !title) {
        return null;
      }

      return {
        id: String(id),
        title: String(title),
        status: row.status ? String(trimValue(row.status)) : undefined,
        date: row.date ? String(trimValue(row.date)) : undefined,
      };
    },
  });
