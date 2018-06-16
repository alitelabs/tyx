import { LambdaContainer, LambdaHandler } from '../../src';
import { NoteService } from './service';
// Creates an Lambda container and publish the service.
const container = new LambdaContainer('tyx-sample1')
  .publish(NoteService);
// Export the lambda handler function
export const handler: LambdaHandler = container.export();
