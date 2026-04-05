const http = require('http');
const fs = require('fs').promises;
const { program } = require('commander');
const { XMLBuilder } = require('fast-xml-parser');

program
  .requiredOption('-i, --input <path>', 'Шлях до файлу для читання')
  .requiredOption('-h, --host <host>', 'Адреса сервера')
  .requiredOption('-p, --port <port>', 'Порт сервера');

program.parse(process.argv);
const options = program.opts();


async function checkFileExists(filePath) {
  try {
    await fs.access(filePath);
  } catch (error) {
    console.error('Cannot find input file');
    process.exit(1);
  }
}


async function startServer() {
  await checkFileExists(options.input);

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${options.host}:${options.port}`);

      const showMfo = url.searchParams.get('mfo') === 'true';
      const showNormal = url.searchParams.get('normal') === 'true';

      const rawData = await fs.readFile(options.input, 'utf-8');
      const jsonData = JSON.parse(rawData);

      let banks = Array.isArray(jsonData)
        ? jsonData
        : jsonData.banks || [];

      
      if (showNormal) {
        banks = banks.filter(bank => Number(bank.COD_STATE) === 1);
      }

      
      const finalData = banks.map(bank => {
        const obj = {};

        if (showMfo && bank.MFO !== undefined) {
          obj.mfo_code = bank.MFO;
        }

        const nameKey = Object.keys(bank).find(k =>
          k.toLowerCase().includes("name")
        );

        if (nameKey) {
          obj.name = bank[nameKey];
        }

        if (showNormal && bank.COD_STATE !== undefined) {
          obj.state_code = bank.COD_STATE;
        }

        return obj;
      });

      const builder = new XMLBuilder({
        format: true
      });

      const xmlObj = {
        banks: {
          bank: finalData
        }
      };

      const xmlContent = builder.build(xmlObj);

      await fs.writeFile('output.xml', xmlContent, 'utf-8');

      res.writeHead(200, { 'Content-Type': 'application/xml' });
      res.end(xmlContent);

    } catch (error) {
      console.error("Server error:", error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  });

  server.listen(options.port, options.host, () => {
    console.log(`Server running at http://${options.host}:${options.port}`);
  });
}

startServer();