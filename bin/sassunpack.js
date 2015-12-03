#!/usr/bin/env node

var yargs = require('yargs')
    .usage('Usage: $0 -f <file> [options]')
    .example('$0 -f foo.scss', 'Cut a sass project in multiple css files')
    .option('d', {
      alias: 'destination',
      default: process.cwd(),
      describe: 'Path to save the output ( map.json + href.json + files)'
    })
    .option('f', {
      alias: 'file',
      demand: true,
      describe: 'File to unpack'
    })
    .option('n', {
      alias: 'name',
      default : 'dev',
      describe: 'Output directory name'
    })
    .option('v', {
      alias: 'verbose',
      default: false,
      describe: 'Debug',
      type: 'bool'
    })
    .version(function() {
      return require('../package').version;
    })
    .help('h')
    .alias('h', 'help')
    .epilog('copyright 2015');

var argv = yargs.argv;

var path = require('path');
try {

  var fs = require('fs');
  var path = require('path');
  var SassUnpack = require('../sass-unpack.js');

  var file = path.resolve(argv.file);
  var destination = path.resolve(argv.destination);
  var name = argv.name;

  var Package = new SassUnpack({
    src: file,
    name : name,
    verbose: argv.verbose
  });

  var map = Package.unpackTo({ dest: destination });

  fs.writeFileSync(path.resolve(destination) + '/'+name+'/href.json', JSON.stringify(map.href));
  fs.writeFileSync(path.resolve(destination) + '/'+name+'/map.json', JSON.stringify(map.sass));

  if (argv.verbose) {
    console.log('href saved ( '+ path.resolve(destination) + '/'+name+'/href.json )');
    console.log('map saved ( '+ path.resolve(destination) + '/'+name+'/map.json )');
  }

} catch (e) {

  if (e.code === 'ENOENT') {
    console.error('Error: no such file or directory "' + e.path + '"');
  }
  else {
    console.log('Error: ' + e.message);
  }

  process.exit(1);
}
