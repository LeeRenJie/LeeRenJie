const fs = require("fs");
const Parser = require("rss-parser");

const parser = new Parser();

// 🔹 Fetch Hashnode posts via GraphQL API
async function fetchHashnode() {
  const query = `
    {
      user(username: "leerenjie") {
        publication {
          posts(page: 0) {
            title
            slug
            dateAdded
          }
        }
      }
    }
  `;

  const res = await fetch("https://api.hashnode.com/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });

  const data = await res.json();
  return data.data.user.publication.posts.map(post => ({
    title: post.title,
    link: `https://leerenjie.hashnode.dev/${post.slug}`,
    date: new Date(post.dateAdded)
  }));
}

// 🔹 Fetch FreeCodeCamp posts via RSS
async function fetchFCC() {
  const feed = await parser.parseURL(
    "https://www.freecodecamp.org/news/author/LeeRenJie/rss/"
  );
  return feed.items.map(item => ({
    title: item.title,
    link: item.link,
    date: new Date(item.isoDate)
  }));
}

(async () => {
  try {
    const hashnodePosts = await fetchHashnode();
    const fccPosts = await fetchFCC();

    // Merge, sort by date, take latest 5
    const allPosts = [...hashnodePosts, ...fccPosts]
      .sort((a, b) => b.date - a.date)
      .slice(0, 5);

    // Format as Markdown list
    const list = allPosts
      .map(p => `- [${p.title}](${p.link}) - ${p.date.toISOString().split("T")[0]}`)
      .join("\n");

    // Replace placeholder in README
    let readme = fs.readFileSync("README.md", "utf8");
    const start = "<!-- BLOG-POST-LIST:START -->";
    const end = "<!-- BLOG-POST-LIST:END -->";
    const regex = new RegExp(`${start}[\\s\\S]*${end}`, "m");

    const replacement = `${start}\n${list}\n${end}`;
    readme = readme.replace(regex, replacement);

    fs.writeFileSync("README.md", readme);
    console.log("✅ README updated with latest blog posts.");
  } catch (err) {
    console.error("❌ Failed to update blogs:", err);
    process.exit(1);
  }
})();
