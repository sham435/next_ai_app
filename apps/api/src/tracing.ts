/**
 * OpenTelemetry tracing setup
 * Must be imported before any other modules
 */
// import { NodeSDK } from '@opentelemetry/sdk-node';
// import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
// import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
//
// Uncomment and install packages when ready:
// npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-otlp-http
//
// const sdk = new NodeSDK({
//   traceExporter: new OTLPTraceExporter({
//     url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
//   }),
//   instrumentations: [getNodeAutoInstrumentations()],
// });
//
// sdk.start();
// console.log('OpenTelemetry tracing initialized');

export {};
