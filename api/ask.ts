import { handler } from '../server/http';
import { ask } from '../server/services';
export default handler((b) => ask({ articleId: b.articleId, level: b.level, draft: b.draft, question: b.question, feedback: b.feedback, chat: b.chat }));
