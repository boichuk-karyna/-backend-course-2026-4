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
    console.error("Missing required parameter");
    process.exit(1);
}

async function readJson() {
    try {
        const data = await fs.readFile(inputFile, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Cannot find input file");
        process.exit(1);
    }
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const query = parsedUrl.query;

    const showMfo = query.mfo === 'true';
    const showNormal = query.normal === 'true';

    const jsonData = await readJson();

    let banks = jsonData;

    if (showNormal) {
        banks = banks.filter(bank => bank.COD_STATE == 1);
    }

    const result = {
        banks: {
            bank: banks.map(bank => {
                let obj = {};

                if (showMfo) obj.mfo_code = bank.MFO;
                obj.name = bank.NAME;
                if (showNormal || showMfo) obj.state_code = bank.COD_STATE;

                return obj;
            })
        }
    };

    const builder = new XMLBuilder();
    const xml = builder.build(result);

    res.writeHead(200, { 'Content-Type': 'application/xml' });
    res.end(xml);
});

server.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}/`);
});