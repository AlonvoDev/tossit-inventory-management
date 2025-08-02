// src/service-worker.ts
/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;
export type {};

self.addEventListener("install", () => {
    console.log("TossIt service worker installed");
    self.skipWaiting();
  });
  
  self.addEventListener("activate", () => {
    console.log("TossIt service worker activated");
  });