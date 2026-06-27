const http=require('http'),fs=require('fs'),path=require('path'),os=require('os');
const PORT=8123;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.geojson':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]); if(p==='/')p='/index.html';
  const fp=path.join(__dirname,p);
  fs.readFile(fp,(e,d)=>{ if(e){res.writeHead(404);res.end('404');return;}
    res.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'application/octet-stream','Cache-Control':'no-store'}); res.end(d); });
}).listen(PORT,'0.0.0.0',()=>{                     // 0.0.0.0 = reachable from other devices on the LAN/Wi-Fi
  const ips=[].concat(...Object.values(os.networkInterfaces()))
    .filter(i=>i.family==='IPv4'&&!i.internal).map(i=>i.address);
  console.log('local:  http://localhost:'+PORT);
  ips.forEach(ip=>console.log('Wi-Fi:  http://'+ip+':'+PORT));
});
