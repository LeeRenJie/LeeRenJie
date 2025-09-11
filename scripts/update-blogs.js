const ParserClass = require("rss-parser").default;
const fs = require("fs");
const fetch = require("node-fetch");

const HASHNODE_API = "https://gql.hashnode.com/";
const HASHNODE_USERNAME = "leerenjie"; // change if needed
const FCC_FEED = "https://www.freecodecamp.org/news/author/leerenjie/rss/";

async function fetchHashnode() {
  const query = `
    query GetUserArticles($page: Int!) {
      user(username: "${HASHNODE_USERNAME}") {
        publication {
          posts(page: $page) {
            title
            brief
            slug
            dateAdded
          }
        }
      }
    }
  `;

  const res = await fetch(HASHNODE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { page: 0 } }),
  });

  const data = await res.json();
  if (!data.data?.user?.publication?.posts) {
    throw new Error("Failed to fetch Hashnode posts. Response: " + JSON.stringify(data));
  }

  return data.data.user.publication.posts.map((post) => ({
    title: post.title,
    link: `https://${HASHNODE_USERNAME}.hashnode.dev/${post.slug}`,
    pubDate: post.dateAdded,
    source: "Hashnode",
  }));
}

async function fetchFreeCodeCamp() {
  const Parser = new ParserClass();
  const feed = await Parser.parseURL(FCC_FEED);

  return feed.items.map((item) => ({
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    source: "freeCodeCamp",
  }));
}

async function main() {
  try {
    const [hashnodePosts, fccPosts] = await Promise.all([
      fetchHashnode(),
      fetchFreeCodeCamp(),
    ]);

    // merge and sort by date
    const allPosts = [...hashnodePosts, ...fccPosts].sort(
      (a, b) => new Date(b.pubDate) - new Date(a.pubDate)
    );

    // keep latest 5
    const latestFive = allPosts.slice(0, 5);

    // save to file (adjust path as needed)
    fs.writeFileSync("blogs.json", JSON.stringify(latestFive, null, 2));
    console.log("✅ Blogs updated:", latestFive);
  } catch (err) {
    console.error("❌ Failed to update blogs:", err);
    process.exit(1);
  }
}

main();
