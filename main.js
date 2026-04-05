const http = require('http');
const fs = require('fs').promises;
const url = require('url');
const { XMLBuilder } = require('fast-xml-parser');


const args = process.argv.slice(2);

let inputFile, host, port;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '-i' || args[i] === '--input') {
        inputFile = args[i + 1];
    }
    if (args[i] === '-h' || args[i] === '--host') {
        host = args[i + 1];
    }
    if (args[i] === '-p' || args[i] === '--port') {
        port = args[i + 1];
    }
}


if (!inputFile || !host || !port) {
    console.error("Missing required parameters");
    process.exit(1);
}


async function readJson() {
    const data = await fs.readFile(inputFile, 'utf8');
    return JSON.parse(data);
}


const server = http.createServer(async (req, res) => {
    try {
        const parsedUrl = url.parse(req.url, true);
        const query = parsedUrl.query;

        const showMfo = query.mfo === 'true';
        const showNormal = query.normal === 'true';

        const jsonData = await readJson();

       
        let banks = Array.isArray(jsonData)
            ? jsonData
            : jsonData.banks || [];

     
        if (showNormal) {
            banks = banks.filter(bank => Number(bank.COD_STATE) === 1);
        }

   
        const result = {
            banks: {
                bank: banks.map(bank => {
                    const obj = {};

                    // MFO
                    if (showMfo && bank.MFO !== undefined) {
                        obj.mfo_code = bank.MFO;
                    }

                  
                    const nameKey = Object.keys(bank).find(k =>
                        k.toLowerCase().includes("name")
                    );

                    obj.name = nameKey ? bank[nameKey] : "Unknown";

                   
                    if (showNormal && bank.COD_STATE !== undefined) {
                        obj.state_code = bank.COD_STATE;
                    }

                    return obj;
                })
            }
        };

        const builder = new XMLBuilder();
        const xml = builder.build(result);

        res.writeHead(200, { 'Content-Type': 'application/xml' });
        res.end(xml);

    } catch (err) {
        if (err.code === 'ENOENT') {
            res.writeHead(500);
            res.end("Cannot find input file");
        } else {
            res.writeHead(500);
            res.end("Server error");
        }
    }
});


server.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}/`);
});