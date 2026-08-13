/** Encode / decode rich post previews shared inside DMs */

export function encodeSharedPost(post: {
  id: string;
  author_id: string;
  author_name?: string | null;
  body?: string | null;
  image_url?: string | null;
  image_urls?: string[] | null;
}): string {
  const img =
    (post.image_urls && post.image_urls[0]) || post.image_url || "";
  const name = (post.author_name || "Player").replace(/\n/g, " ").slice(0, 40);
  const snippet = (post.body || "").replace(/\n/g, " ").slice(0, 120);
  return [
    `[neparena:post:${post.id}]`,
    `from:${post.author_id}`,
    `name:${name}`,
    snippet ? `text:${snippet}` : "",
    img ? `img:${img}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function parseSharedPost(body: string | null): {
  postId: string;
  authorId: string;
  authorName: string;
  text: string;
  imageUrl: string | null;
} | null {
  if (!body || !body.startsWith("[neparena:post:")) return null;
  const lines = body.split("\n");
  const idMatch = lines[0]?.match(/^\[neparena:post:([a-f0-9-]+)\]$/i);
  if (!idMatch) return null;
  let authorId = "";
  let authorName = "Player";
  let text = "";
  let imageUrl: string | null = null;
  for (const line of lines.slice(1)) {
    if (line.startsWith("from:")) authorId = line.slice(5);
    else if (line.startsWith("name:")) authorName = line.slice(5);
    else if (line.startsWith("text:")) text = line.slice(5);
    else if (line.startsWith("img:")) imageUrl = line.slice(4) || null;
  }
  return { postId: idMatch[1], authorId, authorName, text, imageUrl };
}

export function previewSharedBody(body: string | null): string {
  const shared = parseSharedPost(body);
  if (shared) return "Shared a post";
  return body || "";
}
