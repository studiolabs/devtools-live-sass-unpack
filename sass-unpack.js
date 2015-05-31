'use strict';

var path = require('path');
var _ = require('lodash');
var glob = require('glob');
var fs = require('fs');
var util = require('util');

function SassUnpack(options) {

  this.filepath = path.resolve(options.src);

  if (fs.lstatSync(this.filepath).isFile()) {

    options = processOptions(options);

    this.dest = options.dest || false ;
    this.dir = path.resolve(path.dirname(this.filepath));
    this.loadPaths = options.loadPaths || [];
    this.extensions = options.extensions || [];
    this.index = [];
    this.link = [];

  }
};

SassUnpack.prototype.unpackTo = function(options) {

	var toPath = options.dest;
	var urlRoot = options.urlRoot;

  var SassMap = require('sass-map');

  var mapSass =  new SassMap(this.filepath);


  fs.writeFileSync(path.resolve('./') + '/dist/mapsass.json', util.inspect(mapSass, { showHidden: true, depth: null }));

  var files = this.cutSourceFileWithMap(this.filepath, mapSass);

  this.dir = path.resolve(toPath);

  return this.generateFiles(files, mapSass, this.dir, urlRoot);

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

  		 var loadPaths = _([this.dir]).concat(this.loadPaths).filter().uniq().value();

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

SassUnpack.prototype.generateFiles = function(files, mapSass, toPath, urlRoot) {

  var mkdirp = require('mkdirp');

  var mapIndex = [];
  var indexFile = 0;
  var map = [];

  var devFilePath = toPath + '/dev/sass/index.scss';
  var devFileCSSUrl = urlRoot+'/dev/css/index.css';

  map.push({
    file: devFilePath,
    href: devFileCSSUrl
  });

  mkdirp.sync(path.dirname(devFilePath));

  fs.writeFileSync(devFilePath, files.main.source);

  files.packages.forEach(function(file) {

    //console.log(mapSass[file.path]);
    //
  
    file = _.assign(mapSass.index[file.path], file);

    var fileName =  file.path.replace(path.resolve('./')+ '/', '')
                            .replace('/', '-')
                            .replace(path.extname(file.path),'');

    var devFileCSSUrl = urlRoot + '/dev/css/' + fileName + '.css';
    var devFilePath = toPath + '/dev/scss/' + fileName + '.scss';

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

    fs.writeFileSync(devFilePath, fileContent.join('\n'));

    map.push({
      file: devFilePath,
      href: devFileCSSUrl
    });

  }.bind(this));

  var buf  = [];

  for (var i in mapIndex) {
    buf.push({
      index: i,
      links: _.uniq(mapIndex[i])
    });
  }

  return {
    href: map,
    sass: buf
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

