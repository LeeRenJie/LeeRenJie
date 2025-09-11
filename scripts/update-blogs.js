import Parser from 'rss-parser';
import fs from 'fs';
import fetch from 'node-fetch';

const HASHNODE_USERNAME = "leerenjie";
const HASHNODE_RSS = `https://${HASHNODE_USERNAME}.hashnode.dev/rss.xml`;
const FCC_FEED = "https://www.freecodecamp.org/news/author/LeeRenJie/rss.xml";

async function fetchHashnode() {
  const parser = new Parser();
  const feed = await parser.parseURL(HASHNODE_RSS);
  return feed.items.map((item) => ({
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    source: "Hashnode",
  }));
}

async function fetchFreeCodeCamp() {
  const parser = new Parser();
  const feed = await parser.parseURL(FCC_FEED);
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
    // save to file
    fs.writeFileSync("blogs.json", JSON.stringify(latestFive, null, 2));
    console.log("✅ Blogs updated:", latestFive);
  } catch (err) {
    console.error("❌ Failed to update blogs:", err);
    process.exit(1);
  }
}

main();
