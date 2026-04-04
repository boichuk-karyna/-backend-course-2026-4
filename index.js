const { Command } = require("commander");

const program = new Command();

program
  .option("-n, --name <type>", "your name")
  .option("-a, --age <number>", "your age");

program.parse(process.argv);

const options = program.opts();

console.log("Options:", options);