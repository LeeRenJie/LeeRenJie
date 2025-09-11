import Parser from 'rss-parser';
import fs from 'fs';
import fetch from 'node-fetch';

const HASHNODE_USERNAME = "leerenjie";
const HASHNODE_RSS = `https://${HASHNODE_USERNAME}.hashnode.dev/rss.xml`;
const FCC_FEED = "https://www.freecodecamp.org/news/author/LeeRenJie/rss.xml";

// Add delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, retries = 3, delayMs = 2000) {
  const parser = new Parser({
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Blog-Updater/1.0)'
    }
  });
  
  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) {
        console.log(`Retry ${i} for ${url}...`);
        await delay(delayMs * i); // Exponential backoff
      }
      const feed = await parser.parseURL(url);
      return feed.items;
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed for ${url}:`, error.message);
      if (i === retries - 1) throw error;
    }
  }
}

async function fetchHashnode() {
  try {
    const items = await fetchWithRetry(HASHNODE_RSS);
    return items.map((item) => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      source: "Hashnode",
    }));
  } catch (error) {
    console.warn("⚠️ Could not fetch Hashnode posts:", error.message);
    return [];
  }
}

async function fetchFreeCodeCamp() {
  try {
    const items = await fetchWithRetry(FCC_FEED);
    return items.map((item) => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      source: "freeCodeCamp",
    }));
  } catch (error) {
    console.warn("⚠️ Could not fetch FreeCodeCamp posts:", error.message);
    return [];
  }
}

async function main() {
  try {
    // Add delay between different feeds
    const hashnodePosts = await fetchHashnode();
    await delay(3000); // Wait 3 seconds
    const fccPosts = await fetchFreeCodeCamp();
    
    // merge and sort by date
    const allPosts = [...hashnodePosts, ...fccPosts].sort(
      (a, b) => new Date(b.pubDate) - new Date(a.pubDate)
    );
    
    // keep latest 5
    const latestFive = allPosts.slice(0, 5);
    
    if (latestFive.length === 0) {
      console.warn("⚠️ No posts found from any source");
      // Create empty blogs.json to prevent errors
      fs.writeFileSync("blogs.json", JSON.stringify([], null, 2));
    } else {
      // save to file
      fs.writeFileSync("blogs.json", JSON.stringify(latestFive, null, 2));
      console.log("✅ Blogs updated:", latestFive);
    }
  } catch (err) {
    console.error("❌ Failed to update blogs:", err);
    process.exit(1);
  }
}

main();
