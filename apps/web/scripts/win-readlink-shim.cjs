'use strict'

/**
 * Windows + non-C: drives: Node's fs.readlink throws EISDIR on ordinary files.
 * Next.js 15 webpack tracing only swallows EINVAL/ENOENT/UNKNOWN, so the production
 * build aborts. Map EISDIR → EINVAL so tracing treats the path as "not a symlink".
 * No-op on platforms where readlink behaves.
 */
const fs = require('node:fs')

function asEinval(err) {
  if (!err || err.code !== 'EISDIR') return err
  const mapped = new Error(String(err.message).replace('EISDIR', 'EINVAL'))
  mapped.code = 'EINVAL'
  mapped.errno = err.errno
  mapped.path = err.path
  mapped.syscall = err.syscall
  return mapped
}

const origSync = fs.readlinkSync
fs.readlinkSync = function readlinkSyncPatched(...args) {
  try {
    return origSync.apply(this, args)
  } catch (err) {
    throw asEinval(err)
  }
}

const orig = fs.readlink
fs.readlink = function readlinkPatched(path, options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = undefined
  }
  if (typeof callback === 'function') {
    return orig.call(fs, path, options, (err, link) => callback(asEinval(err), link))
  }
  try {
    return orig.call(fs, path, options)
  } catch (err) {
    throw asEinval(err)
  }
}

if (fs.promises?.readlink) {
  const origPromise = fs.promises.readlink.bind(fs.promises)
  fs.promises.readlink = async function readlinkPromisePatched(...args) {
    try {
      return await origPromise(...args)
    } catch (err) {
      throw asEinval(err)
    }
  }
}
