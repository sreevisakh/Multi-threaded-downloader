#!/usr/bin/env node
/**
 * Created by tushar.mathur on 04/06/16.
 */

'use strict'

import Rx from 'rx'
import _ from 'lodash'
import meow from 'meow'
import humanize from 'humanize-plus'
import newDownload from '../NewDownload'
import resumeDownload from '../ResumeDownload'
import {createDownload} from '../index'
import ProgressBar from 'progress'

const flags = meow(`		
 Usage		
 	  mtd		
 		
 	Options		
 	  --url            The url of the file that needs to be downloaded		
 	  --file           Path to the .mtd file for resuming failed downloads		
 		
 	Examples		
 	  mtd --url http://www.sample-videos.com/video/mp4/720/big_buck_bunny_720p_1mb.mp4		
 	  mtd --file big_buck_bunny_720p_1mb.mp4.mtd		
   `).flags

if (!_.some([flags.url, flags.file], (x) => x)) {
  process.exit(0)
}

const pFlags = Rx.Observable.just(flags)

// TODO: Add unit tests
const downloads = Rx.Observable.merge(
  newDownload(createDownload, pFlags),
  resumeDownload(createDownload, pFlags)
).share()

const progress = downloads
  .pluck('message', 'totalBytes')
  .filter((x) => x > 0)
  .first()
  .map((total) => new ProgressBar(':bar :percent', {total, complete: '█', incomplete: '░'}))
  .tap((x) => console.log(`SIZE: ${humanize.fileSize(x.total)}`)).share()

downloads
  .filter((x) => x)
  .filter((x) => x.event === 'DATA')
  .pluck('message')

  .map((x) => _.sum(_.map(x.offsets, (o, i) => o - x.threads[i][0])) / x.totalBytes)
  .withLatestFrom(progress, (bytes, progress) => ({bytes, progress}))
  .subscribe((x) => x.progress.update(x.bytes))

downloads.last()
  .withLatestFrom(progress, (a, b) => b)
  .subscribe((x) => {
    x.update(x.total)
    console.log('Download Completed!')
  })
