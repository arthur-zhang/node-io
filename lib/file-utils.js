'use strict';

var fs = require('fs');
var path = require('path');

var errno = require('./errno');

var fileUtils = module.exports;

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
    console.log(filePath);
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
fileUtils.mkdirsSync = mkdirsSync;
fileUtils.mkdirs = mkdirs;

