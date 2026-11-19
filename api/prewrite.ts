import { handler } from '../server/http';
import { prewrite } from '../server/services';
export default handler((b) => prewrite({ articleId: b.articleId, level: b.level }));
