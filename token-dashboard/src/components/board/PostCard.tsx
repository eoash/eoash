import type { BoardPost } from "@/lib/notion-board";
import ReactionBar from "./ReactionBar";

interface Props {
  post: BoardPost;
  compact?: boolean;
}

export default function PostCard({ post, compact }: Props) {
  const isProduct = post.category === "프로덕트";

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden transition-colors hover:border-gray-700">
      {/* 프로덕트 썸네일 */}
      {isProduct && post.thumbnail && !compact && (
        <div className="aspect-video bg-gray-800 overflow-hidden">
          <img
            src={post.thumbnail}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className={compact ? "p-3" : "p-4"}>
        {/* 카테고리 + 고정 배지 */}
        <div className="flex items-center gap-1.5 mb-1.5">
          {post.pinned && (
            <span className="text-[10px] font-semibold text-[#F59E0B] bg-[#F59E0B]/10 px-1.5 py-0.5 rounded">
              📌
            </span>
          )}
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              isProduct
                ? "text-[#00E87A] bg-[#00E87A]/10"
                : "text-[#3B82F6] bg-[#3B82F6]/10"
            }`}
          >
            {isProduct ? "프로덕트" : "공지"}
          </span>
        </div>

        {/* 제목 */}
        {post.link ? (
          <a
            href={post.link}
            target="_blank"
            rel="noopener noreferrer"
            className={`font-semibold text-gray-100 hover:text-[#00E87A] transition-colors line-clamp-1 block ${compact ? "text-sm" : "text-base"}`}
          >
            {post.title}
          </a>
        ) : (
          <h3
            className={`font-semibold text-gray-100 line-clamp-1 ${compact ? "text-sm" : "text-base"}`}
          >
            {post.title}
          </h3>
        )}

        {/* 본문 */}
        {!compact && post.body && (
          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
            {post.body}
          </p>
        )}

        {/* 작성자 + 날짜 */}
        <div
          className={`flex items-center gap-2 text-gray-500 ${compact ? "text-[10px] mt-1" : "text-xs mt-2"}`}
        >
          <span>{post.author}</span>
          <span>·</span>
          <span>{post.date.slice(5)}</span>
        </div>

        {/* 반응 */}
        <ReactionBar
          postId={post.id}
          reactions={post.reactions}
          compact={compact}
        />
      </div>
    </div>
  );
}
