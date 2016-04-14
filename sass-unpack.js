'use strict';


var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var _ = require('lodash');
var util = require('util');
var _ = require('lodash');

function SassUnpack(options) {

  	this.filepath = path.resolve(options.file);

	fs.accessSync(this.filepath);

	if (fs.lstatSync(this.filepath).isFile()) {

    options = processOptions(options);
	this.name = options.name || '_' +path.basename(this.filepath)+'_';
	this.bVerbose = options.verbose || false ;
	this.bMap = options.map || false ;
	this.bSourceMap = options.sourcemap || false ;
	this.write = options.write || fs.writeFileSync ;
	this.mkdir = options.mkdir || mkdirp.sync ;
	this.output = path.resolve( options.output || path.dirname(this.filepath));
	this.index = [];
	this.link = [];
	this.sourceDir = path.resolve( options.directory || path.dirname(this.filepath)) + '/';
	this.rootDir = path.resolve( options.root || process.cwd()) + '/';
    this.extensions = options.extensions || [];

	this.bHref = options.href || false ;

  }
};

SassUnpack.prototype.unpack = function() {

	if (this.bVerbose) {
		console.log("Reading file...")
	}

  	var SassMap = require('sass-map');

  	var SassSourceMap =  new SassMap(this.filepath);

	if (this.bVerbose) {
		console.log("Unpacking...")
	}

  	var SassFiles = this.cutSourceFileWithMap(this.filepath, SassSourceMap);

 	if (this.bVerbose) {
		console.log("Saving Files...")
	}

  return this.generateFiles(SassFiles, SassSourceMap, this.output);

};

SassUnpack.prototype.cutSourceFileWithMap = function(srcFilePath, mapSass) {

  var result = {
    main: {
      source: '',
    },
    packages: []
  };

  var content = fs.readFileSync(srcFilePath, 'utf8');
  content = content.replace(/\/\*.+?\*\/|\/\/.*(?=[\n\r])/g, '');

  var position = 0;
  var regImport = /\@import [\'|\"]([a-zA-Z0-9-\._\/]+)[\'|\"]/;

  var cssClass = [];
  var packages = [];
  var source = [];

  var loadPaths = _([this.sourceDir]).concat(this.loadPaths).filter().uniq().value();

  content.split('\n').forEach(function(line, iLine) {

    line = line.trim();
    var matchImport = regImport.exec(line);

    if (matchImport) {

      var importFilePath = resolveSassPath(matchImport[1].trim(), loadPaths, this.extensions);

      if (importFilePath) {
        var importLine = '@import \'' + importFilePath + '\';';

        var file = {
          line: importLine,
          index: iLine,
          path:  importFilePath,
          css: cssClass.slice(0, cssClass.length)
        };

        if (mapSass.index[this.filepath].dependencies.indexOf(importFilePath) >= 0) {
          source.push(importLine);
        } else {
          packages.push(file);
        }
      }else {
        throw new Error('Impossible to resolve Sass Path  in ' + this.filepath + ' - line : ' + iLine + ' \n ' + line);
      }

    } else {
      source.push(line);
    }

    var open = line.match(/\{/g) || [];
    var close = line.match(/\}/g) || [];
    position += open.length;
    position -= close.length;

    if (position != cssClass.length) {
      if (position > cssClass.length) {
        cssClass.push(line);
      } else {
        cssClass.pop();
      }
    }
  }.bind(this));

  result.main.source = source.join('\n');
  result.packages = packages;

  return result;

};

function addToIndex(mapIndex, filepath, link) {
  if (mapIndex[filepath] === undefined) {
    mapIndex[filepath] = [];
  }

  if (mapIndex[filepath].indexOf(link) == -1) {
    mapIndex[filepath].push(link);
  }
}

SassUnpack.prototype.generateFiles = function(files, mapSass, toPath) {

  var mapIndex = [];
  var indexFile = 0;
  var map = [];

  this.mkdir(toPath + '/'+this.name+'/scss/');
  this.mkdir(toPath + '/'+this.name+'/css/');

  var devFilePath = toPath + '/'+this.name+'/scss/index.scss';
  var devFileCSSUrl = this.name+'/css/index.css';
  var fileName = this.name+'/scss/index.scss';

  var source = this.filepath.replace(this.sourceDir, '');
  map.push({
  	 path: this.filepath,
  	 tmp: devFilePath,
     url: devFileCSSUrl,
     src : source
    });

  this.write(devFilePath, files.main.source);

  files.packages.forEach(function(file) {

    file = _.assign(mapSass.index[file.path], file);

    var fileName =  file.path.replace(path.resolve('./')+ '/', '')
                            .replace(/\//g, '-')
                            .replace(path.extname(file.path),'');

    var devFileCSSUrl = this.name+'/css/' + fileName + '.css';
    var devFilePath = toPath + '/'+this.name+'/scss/' + fileName + '.scss';

    addToIndex(mapIndex, file.path, devFilePath);

    var fileContent = [];

    file.dependencies.forEach(function(item) {
      if (file.path !== item) {
      	addToIndex(mapIndex, item, devFilePath);
        fileContent.push('@import \'' + item + '\';');
      }
    });

    file.imports.forEach(function(item) {
      addToIndex(mapIndex, item, devFilePath);
    });

    file.extended.forEach(function(item) {
       if (file.path !== item) {
      	addToIndex(mapIndex, item, devFilePath);
        fileContent.push('@import \'' + item + '\';');
      }
    }.bind(this));

    fileContent.push('/* unsass */');

    var cssContent = [];
    file.css.forEach(function(cssClass) {
      cssContent.push(cssClass);
    });

    cssContent.push(file.line);

    file.css.forEach(function(cssClass) {
      cssContent.push('}');
    });

    fileContent.push(cssContent.join('\n'));

    this.write(devFilePath, fileContent.join('\n'));

    var source = file.path.replace(this.sourceDir, '');
    map.push({
      path: file.path,
      url: devFileCSSUrl,
      tmp : devFilePath,
      src : source
    });



  }.bind(this));

  for (var i in mapIndex) {
    mapIndex[i] = _.uniq(mapIndex[i]);
  }

	if (this.bMap) {

	this.write(toPath+'/'+this.name+'/sass.map.json', JSON.stringify(map));

		if (this.bVerbose) {
			console.log('sass.map.json generated');
		}

	}

	if (this.bHref) {

	this.write(toPath+'/'+this.name+'/sass.links.json', JSON.stringify(mapIndex));

		if (this.bVerbose) {
			console.log('sass.links.json generated');
		}

	}

	return {
		map : map,
		links : mapIndex
	};
}

// resolve a sass module to a path

function resolveSassPath(sassPath, loadPaths, extensions) {
  // trim sass file extensions
  var re = new RegExp('(\.(' + extensions.join('|') + '))$', 'i');
  var sassPathName = sassPath.replace(re, '');

  // check all load paths
  //

  var i, j, length = loadPaths.length,
	scssPath, partialPath;
  for (i = 0; i < length; i++) {
    for (j = 0; j < extensions.length; j++) {
      scssPath = path.normalize(loadPaths[i] + '/' + sassPathName + '.' + extensions[j]);
      if (fs.existsSync(scssPath)) {
        return scssPath;
      }
    }

    // special case for _partials
    for (j = 0; j < extensions.length; j++) {
      scssPath = path.normalize(loadPaths[i] + '/' + sassPathName + '.' + extensions[j]);
      partialPath = path.join(path.dirname(scssPath), '_' + path.basename(scssPath));
      if (fs.existsSync(partialPath)) {
        return partialPath;
      }
    }
  }

  // File to import not found or unreadable so we assume this is a custom import
  return false;
}

function processOptions(options) {
  return _.assign({
    loadPaths: [process.cwd()],
    extensions: ['scss', 'css'],
  }, options);
}

module.exports =  SassUnpack;
