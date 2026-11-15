// Test-only bridge: an isolated Node process imports the deploy artifact outside node_modules.
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
if (!process.env.TOSSIT_FIREBASE_PROJECT_ID?.startsWith('demo-') || !/^(localhost|127\.0\.0\.1):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST ?? '') || !/^(localhost|127\.0\.0\.1):\d+$/.test(process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '')) throw new Error('Local demo emulators required');
const { default: handler } = await import(pathToFileURL(process.argv[2]).href);
const prefix = `/${process.env.TOSSIT_FIREBASE_PROJECT_ID}/us-central1`;
const server = createServer(async (request,response) => {
  try {
    const chunks=[];for await (const chunk of request) chunks.push(chunk);
    const headers=new Headers();for(const [key,value] of Object.entries(request.headers))if(typeof value==='string')headers.set(key,value);
    const reply=await handler.fetch(new Request('http://127.0.0.1:5001'+request.url.replace(prefix,''),{method:request.method,headers,body:Buffer.concat(chunks)}));
    response.writeHead(reply.status,Object.fromEntries(reply.headers));response.end(await reply.text());
  } catch { response.writeHead(500);response.end('Test host failed'); }
});
server.listen(5001,'127.0.0.1',()=>console.log('tossit-test-host-ready'));
