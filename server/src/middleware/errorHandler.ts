import { ProblemDetails } from '../models/types.js';

export function createProblemDetails(
  status: number,
  title: string,
  detail: string,
  instance?: string,
  invalidParams?: Array<{ name: string; reason: string }>
): ProblemDetails {
  return {
    type: `https://developer.nyc311.gov/errors/${status}`,
    title,
    status,
    detail,
    instance,
    invalidParams
  };
}

export function sendProblemDetails(
  res: any,
  status: number,
  title: string,
  detail: string,
  instance?: string,
  invalidParams?: Array<{ name: string; reason: string }>
): void {
  const problem = createProblemDetails(status, title, detail, instance, invalidParams);
  res.writeHead(status, {
    'Content-Type': 'application/problem+json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept'
  });
  res.end(JSON.stringify(problem, null, 2));
}
