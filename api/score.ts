import { handler } from '../server/http';
import { score } from '../server/services';
export default handler((b) => score({ articleId: b.articleId, level: b.level, draft: b.draft, revised: b.revised, rubric: b.rubric }));
