// Local verification server for this project only. Never stops existing servers.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.glb':'model/gltf-binary','.css':'text/css'};
const server=http.createServer((req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  const relative=path.relative(root,file);
  if(relative.startsWith('..')||path.isAbsolute(relative)||relative.split(path.sep).some(p=>p.startsWith('.'))){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);});
});
let port=Number(process.env.PORT)||4317;
server.on('error',error=>{if(error.code==='EADDRINUSE'){port++;server.listen(port,'127.0.0.1');}else throw error;});
server.on('listening',()=>console.log(`Akihabara skeleton prototype 3 - scale calibration — LOCAL PREVIEW ONLY: http://127.0.0.1:${port}/`));
server.listen(port,'127.0.0.1');


