/**
 * Created by tushar.mathur on 21/01/16.
 */

'use strict'
import crypto from 'crypto'
import Rx, {Observable as O} from 'rx'
import request from 'request'
import fs from 'graceful-fs'
import R from 'ramda'
import * as U from '../src/Utils'
import {CreateMTDFile} from '../src/CreateMTDFile'
import {DownloadFromMTDFile} from '../src/DownloadFromMTDFile'
import * as T from '../src/IO'
import {mux, demux} from 'muxer'

export const removeFile = (x) => Rx.Observable.fromCallback(fs.unlink)(x).toPromise()

export const createFileDigest = (path) => {
  const hash = crypto.createHash('sha1')
  return new Promise((resolve) => fs
    .createReadStream(path)
    .on('data', (x) => hash.update(x))
    .on('end', () => resolve(hash.digest('hex').toUpperCase()))
  )
}

export const fsStat = (x) => Rx.Observable.fromCallback(fs.stat)(x).toPromise()

export const createTestObserver = (stream) => {
  const out = []
  stream.subscribe((x) => out.push(x))
  return out
}
/**
 * Test UTILS for doing a real download
 * @param _options
 * @returns {Observable}
 */
export const createDownload = (_options) => {
  const HTTP = T.HTTP(request)
  const FILE = T.FILE(fs)
  const options = U.MergeDefaultOptions(_options)

  /**
   * Create MTD File
   */
  const createMTDFile$ = CreateMTDFile({FILE, HTTP}, options).share()
  const [{fdW$}] = demux(createMTDFile$, 'fdW$')

  /**
   * Download From MTD File
   */
  const downloadFromMTDFile$ = createMTDFile$.last()
    .map(options.mtdPath).flatMap(DownloadFromMTDFile({HTTP, FILE})).share()

  const [{fdR$, meta$}] = demux(downloadFromMTDFile$, 'meta$', 'fdR$', 'response$')

  /**
   * Finalize Downloaded FILE
   */
  const finalizeDownload$ = downloadFromMTDFile$.last()
    .withLatestFrom(fdR$, meta$, (_, fd, meta) => ({
      FILE,
      fd$: O.just(fd),
      meta$: O.just(meta)
    }))
    .flatMap(U.FinalizeDownload)
    .share()
    .last()

  /**
   * Close File Descriptors
   */
  const fd$ = finalizeDownload$
    .withLatestFrom(fdW$, fdR$)
    .map(R.tail)
    .flatMap(R.map(R.of))

  return FILE.close(fd$)
}
