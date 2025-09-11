const fs = require("fs");
const Parser = require("rss-parser");
const fetch = require("node-fetch");

const parser = new Parser();

async function fetchHashnode() {
  const query = `
    {
      user(username: "leerenjie") {
        publication {
          posts(page: 0) {
            title
            brief
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

async function fetchFCC() {
  const feed = await parser.parseURL("https://www.freecodecamp.org/news/author/LeeRenJie/rss/");
  return feed.items.map(item => ({
    title: item.title,
    link: item.link,
    date: new Date(item.isoDate)
  }));
}

(async () => {
  const hashnodePosts = await fetchHashnode();
  const fccPosts = await fetchFCC();

  const allPosts = [...hashnodePosts, ...fccPosts]
    .sort((a, b) => b.date - a.date) // sort newest first
    .slice(0, 5); // take latest 5

  const list = allPosts.map(p => `- [${p.title}](${p.link})`).join("\n");

  let readme = fs.readFileSync("README.md", "utf8");
  const start = "<!-- BLOG-POST-LIST:START -->";
  const end = "<!-- BLOG-POST-LIST:END -->";
  const regex = new RegExp(`${start}[\\s\\S]*${end}`, "m");

  const replacement = `${start}\n${list}\n${end}`;
  readme = readme.replace(regex, replacement);

  fs.writeFileSync("README.md", readme);
})();
