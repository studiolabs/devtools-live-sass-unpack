'use strict';

var path = require('path');
var _ = require('lodash');
var glob = require('glob');


function unpack( ){
  var fs = require('fs'),
      path = require('path'),
      combineSourceMap = require('combine-source-map'),
      mkdirp = require('mkdirp'),
      paths  = require('./paths'),
      dest = paths.THEME,
      sassSrc = paths.build.css.screen.replace('./', ''),
      dev = 'dev',
      build = 'build';
    var map = [];

    mkdirp.sync('./' + build + '/' + dev);

    var SassGraph = require('sass-graph');
    var SassVar = [];
    var SassExtend = [];
    var SassUnpack = [];

    var contentMain = "";

    var SassUnpack = SassUnpack.parseFile(path.resolve('./',sassSrc));

    var src = fs.readFileSync(sassSrc, 'utf8');
    var position = 0;
    var regImport = /\@import [\'|\"]([a-zA-Z0-9-\._\/]+)[\'|\"]/;

    var cssClass = [];

    var todo = [];
    src.split('\n').forEach(function(line, iLine) {

      //  console.log(position);
      if (line[0] !== '/') {

        line = line.trim();
        var matchImport = regImport.exec(line);

        if (matchImport) {
          var importFile = matchImport[1].trim();
          if (importFile[0] !== '.' && importFile[0] !== '/') {
            importFile = './' + importFile;
          }
          if (importFile.indexOf('.scss') == -1) {
            importFile = importFile + '.scss';
          }
          var importFilePath = path.resolve(path.dirname(sassSrc), importFile).replace(path.resolve('./') + '/', '');

          if (SassUnpack[importFilePath] == undefined) {

            SassUnpack[importFilePath] = {
              include: []
            };
          }

          SassUnpack[importFilePath].line = '@import \'' + path.resolve('./') + '/' + importFilePath + '\';';
          SassUnpack[importFilePath].index = iLine;
          SassUnpack[importFilePath].name = importFilePath.split('/').join('-');
          SassUnpack[importFilePath].css = cssClass.slice(0, cssClass.length);

          if (SassUnpack[mainFile].links.indexOf(importFilePath) >= 0) {
            contentMain += '@import \'' + path.resolve('./') + '/' + importFilePath + '\';\n';
          } else {
            todo.push(importFilePath);
          }

        } else {

          contentMain += line + '\n';

        }

        var open = line.match(/\{/g) || [];
        var close = line.match(/\}/g) || [];
        position += open.length;
        position -= close.length;

        if (position != cssClass.length) {
          if (position > cssClass.length) {
            cssClass.push(line.trim());
          } else {
            cssClass.pop();
          }
        }
      }
    });


    var mapIndex = [];
    var indexFile = 0;
    var devFileUrl = '/' + dev + '/sass/' + indexFile + '.scss';
    var devFilePath = './' + build + devFileUrl;
    var devFileCSSUrl = '/' + dev + '/css/' + indexFile + '.css';

    map.push({
      file: devFilePath,
      href: devFileCSSUrl
    });


    mkdirp.sync(path.dirname(devFilePath));

    fs.writeFileSync(devFilePath, contentMain);


    function addToIndex(filepath,link){


       if(mapIndex[filepath] == undefined){
        mapIndex[filepath] = [];
      }

      if(mapIndex[filepath].indexOf(link)== -1){
        mapIndex[filepath].push(link);
      }

    }

    todo.forEach(function(filepath) {

      var file = SassUnpack[filepath];

      indexFile++;
      var devFileUrl = '/' + dev + '/sass/' + indexFile + '_' + file.name;
      var devFileCSSUrl = '/' + dev + '/css/' + indexFile + '_' + file.name.replace('.scss', '.css');

      var devFilePath = './' + build + devFileUrl;

      addToIndex(filepath,devFilePath);

      var fileContent = [];

      file.include.forEach(function(item) {

         addToIndex(item,devFilePath);

         fileContent.push('@import \'' + path.resolve('./') + '/' + item + '\';');
      });

      file.imports.forEach(function(item) {
         addToIndex(item,devFilePath);
      });


      file.extend.forEach(function(index) {
        if (SassExtend[index] != undefined) {

          SassExtend[index].forEach(function(indexExtended) {
            if (indexExtended != filepath) {
              var fileExtended = SassUnpack[indexExtended];

              fileExtended.include.forEach(function(itemExtented) {
                if(file.include.indexOf(itemExtented) == -1){
                    addToIndex(itemExtented,devFilePath);

                 fileContent.push('@import \'' + path.resolve('./') + '/' + itemExtented + '\';');
                }
              });

              var cssContent = [];
              fileExtended.css.forEach(function(cssClass) {
                cssContent.push(cssClass);
              });

              cssContent.push(fileExtended.line);

              fileExtended.css.forEach(function(cssClass) {
                cssContent.push('}');
              });

              fileContent.push(cssContent.join('\n'));
            }

          });
        }


      });

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


    });


    var buf  = [];

    for (var i in mapIndex) {
        buf.push({
            "index": i,
            "links": mapIndex[i]
        });
    }


    fs.writeFileSync(path.resolve('./') + '/' + build + '/href.json', JSON.stringify(map));

    fs.writeFileSync(path.resolve('./') + '/' + build + '/sass.json',JSON.stringify(buf) );
}
}

// resolve a sass module to a path

function resolveSassPath(sassPath, loadPaths, extensions) {
  // trim sass file extensions
  var re = new RegExp('(\.(' + extensions.join('|') + '))$', 'i');
  var sassPathName = sassPath.replace(re, '');
  // check all load paths
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

function SassUnpack(options, dir) {
  this.dir = dir;
  this.loadPaths = options.loadPaths || [];
  this.extensions = options.extensions || [];
  this.index = [];
  this.link = [];

  if (dir) {
    var map = this;
    _(glob.sync(dir + '/**/*.@(' + this.extensions.join('|') + ')', {
      dot: true
    })).forEach(function(file) {
      map.addFile(path.resolve(file));
    }).value();
  }
};

SassUnpack.prototype.getIncludedLink = function (filepath) {

      var importsLinks = [];

      var file = this.index[filepath];

      importsLinks = importsLinks.concat(file.links);

      for (var i in file.imports) {
        var link = file.imports[i];
       // console.log(link);
        importsLinks = importsLinks.concat(this.getIncludedLink(link));
      }

      return importsLinks;
}

// add a sass file to the SassUnpack
SassUnpack.prototype.addFile = function(filepath, parent) {
  var entry = parseData(fs.readFileSync(filepath, 'utf-8'));
  var cwd = path.dirname(filepath);

  var i, length = entry.imports.length,
    loadPaths, resolved;
  for (i = 0; i < length; i++) {
    loadPaths = _([cwd, this.dir]).concat(this.loadPaths).filter().uniq().value();
    resolved = resolveSassPath(entry.imports[i], loadPaths, this.extensions);
    if (!resolved) continue;


    // recurse into dependencies if not already enumerated
    if (!_.contains(entry.imports, resolved)) {
      entry.imports[i]= resolved;
      this.addFile(fs.realpathSync(resolved), filepath);
    }

  }

  this.registerLink(filepath,entry.property);

  this.index[filepath] = entry;

};

// a generic visitor that uses an edgeCallback to find the edges to traverse for a node
SassUnpack.prototype.visit = function(filepath, callback, edgeCallback, visited) {
  filepath = fs.realpathSync(filepath);
  var visited = visited || [];
  if (!this.index.hasOwnProperty(filepath)) {
    edgeCallback('SassUnpack doesn\'t contain ' + filepath, null);
  }
  var edges = edgeCallback(null, this.index[filepath]);

  var i, length = edges.length;
  for (i = 0; i < length; i++) {
    if (!_.contains(visited, edges[i])) {
      visited.push(edges[i]);
      callback(edges[i], this.index[edges[i]]);
      this.visit(edges[i], callback, edgeCallback, visited);
    }
  }
};

function processOptions(options) {
  return _.assign({
    loadPaths: [process.cwd()],
    extensions: ['scss', 'css'],
  }, options);
}

module.exports.parseFile = function(filepath, options) {
  if (fs.lstatSync(filepath).isFile()) {
    filepath = path.resolve(filepath);
    options = processOptions(options);
    var map = new SassUnpack(options);
    map.addFile(filepath);
    map.resolveLink();
    return map;
  }
  // throws
};



module.exports.parseDir = function(dirpath, options) {
  if (fs.lstatSync(dirpath).isDirectory()) {
    dirpath = path.resolve(dirpath);
    options = processOptions(options);
    var map = SassUnpack(options, dirpath);
    return map;
  }
  // throws
};
