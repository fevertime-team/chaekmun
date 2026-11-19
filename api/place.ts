import { handler } from '../server/http';
import { place } from '../server/services';
export default handler((b) => place({ articleId: b.articleId, level: b.level, text: b.text }));
