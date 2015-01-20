'use strict';

var fs = require('fs');
var path = require('path');
var ncp = require('ncp');
var async = require('async');

var errno = require('./errno');

var fileUtils = module.exports;

/**
 * Moves a file.
 * When the destination file is on another file system, do a "copy and delete".
 *
 * @param {string} srcFile the file to be moved
 * @param {string} destFile the destination file
 *
 * @param {function} cb callback function
 */
function moveFile(srcFile, destFile, cb) {
  mkdirs(path.dirname(destFile), function(err) {
    if (err) {
      return cb(err);
    }
    // first rename, if failed do copy and delete
    fs.rename(srcFile, destFile, function(err) {
      if (!err) {
        return cb(null);
      }
      if (err.code !== errno.EXDEV) {
        return cb(err);
      }

      copyFile(srcFile, destFile, function(err) {
        if (err) {
          return cb(err);
        }
        fs.unlink(srcFile, cb);
      });

    })
  });
}

function copyFile(srcFile, destFile, cb) {
  mkdirs(path.dirname(destFile), function(err) {
    if (err) {
      return cb(err);
    }
    ncp(srcFile, destFile, cb);
  });
}

/**
 * Deletes a file
 *
 * @param {string} file the file to be delete
 * @param {function} cb callback function
 */
function deleteFile(file, cb) {
  fs.unlink(file, cb);
}

/**
 * Deletes a file, quietly
 *
 * @param {string} file the file to be delete
 * @param {function} cb callback function
 */
function deleteQuietly(file, cb) {
  fs.unlink(file, function() {
    cb(null);
  });
}

/**
 * Creates the directory by pathname, including any
 * necessary but nonexistent parent directories.
 *
 * @param {string} path path
 * @param {number=} mode the mode
 * @param {function} cb callback function
 */
function mkdirs(filePath, mode, cb) {
  if (typeof mode === 'function') {
    cb = mode;
    mode = undefined;
  }
  if (!mode) {
    mode = parseInt('0777', 8) & (~process.umask());
  }
  cb = cb || function() {};
  filePath = path.resolve(filePath);

  fs.mkdir(filePath, mode, function(err) {
    if (!err) {
      return cb(null);
    }
    if (err.code === errno.ENOENT) {
      mkdirs(path.dirname(filePath), mode, function(err) {
        if (err) {
          cb(err);
        } else {
          mkdirs(filePath, mode, cb);
        }
      });
    } else {
      fs.stat(filePath, function(err2, stat) {
        if (err2 || !stat.isDirectory()) {
          cb(err);
        } else {
          cb(null);
        }
      });
    }
  });
}

/**
 * Synchronous version of mkdirs
 * @param {string} path path
 * @param {number=} mode the mode
 */
function mkdirsSync(filePath, mode) {
  if (!mode) {
    mode = parseInt('0777', 8) & (~process.umask());
  }

  filePath = path.resolve(filePath);
  try {
    fs.mkdirSync(filePath, mode);
  } catch (ex) {
    if (ex.code === errno.ENOENT) {
      mkdirsSync(path.dirname(filePath), mode);
      mkdirsSync(filePath, mode);
    } else {
      var stat;
      try {
        stat = fs.statSync(filePath);
      } catch (ex) {
        throw ex;
      }
      if (!stat.isDirectory()) {
        throw ex;
      }
    }
  }

}

/**
 * Finds files within a given directory (and optionally its subdirectories). All files found are filtered by fileFilterFn.

 * @param {string} directory the directory to search in
 * @param {function} fileFilterFn filter to apply when finding files.
 * @param {function} dirFilterFn optional filter to apply when finding subdirectories. currently not supported
 * @param {function} cb callback function
 */
function listFiles(directory, fileFilterFn, dirFilterFn, cb) {
  var results = [];
  fs.readdir(directory, function(err, files) {
    if (err) {
      return cb(results);
    }
    if (!files) {
      return cb(results);
    }

    async.map(files, innerListFileFn, function(err, fileList) {
      if (err) {
        return cb(results);
      }
      for (var i = 0; i < fileList.length; i++) {
        var item = fileList[i];
        if (item) {
          results.push(item);
        }
      }
      cb(results);
    });
  });

  function innerListFileFn(file, cb) {
    fs.stat(path.join(directory, file), function(err, stats) {
      if (!err && stats.isFile() && fileFilterFn(file)) {
        cb(null, file);
      } else {
        cb(null, null);
      }
    });
  }
}

fileUtils.mkdirsSync = mkdirsSync;
fileUtils.mkdirs = mkdirs;
fileUtils.moveFile = moveFile;
fileUtils.deleteFile = deleteFile;
fileUtils.deleteQuietly = deleteQuietly;
fileUtils.listFiles = listFiles;
