#!/usr/bin/env node

var yargs = require('yargs')
		.usage('Usage: $0 -f <file> -o ./build/ [options]')
    .example('$0 -f foo.scss', 'Cut a sass project in multiple css files')
		.option('o', {
			alias: 'output',
			demand: true,
			describe: 'Path to save the output ( map.json + href.json + files )'
		})
		.option('f', {
			alias: 'file',
			demand: true,
			describe: 'File to unpack'
		})
		.option('n', {
			alias: 'name',
			describe: 'Output directory name'
		})
		.option('d', {
			alias: 'directory',
			describe: 'Source files directory'
		})
		.option('s', {
			alias: 'sourcemap',
			default: false,
			describe: 'Add sourcemap to output files',
			type: 'bool'
		})
		.option('m', {
			alias: 'map',
			default: false,
			describe: 'Generate a map of the generated files',
			type: 'bool'
		})
		.option('h', {
			alias: 'href',
			default: false,
			describe: 'Generate a list of href from the generated files',
			type: 'bool'
		})
		.option('v', {
			alias: 'verbose',
			default: false,
			describe: 'Show logs',
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
	var BrowserifyUnpack = require('../browserify-unpack.js');


	var Package = new BrowserifyUnpack(argv);

	Package.unpack();


} catch (e) {

	if (e.code === 'ENOENT') {
		console.error('Error: no such file or directory "' + e.path + '"');
	}
	else {
		console.log('Error: ' + e.message);
	}

	process.exit(1);
}
