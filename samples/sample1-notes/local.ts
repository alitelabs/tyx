import { ExpressContainer } from '../../src';
import { NoteService } from './service';
// Creates an Express container and publish the service.
const express = new ExpressContainer('tyx-sample1')
  .publish(NoteService);
// Start express server
express.start(5000);
