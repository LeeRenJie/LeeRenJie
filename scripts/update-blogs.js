import Parser from 'rss-parser';
import fs from 'fs';
import fetch from 'node-fetch';

const HASHNODE_USERNAME = "leerenjie";
const HASHNODE_RSS = `https://${HASHNODE_USERNAME}.hashnode.dev/rss.xml`;
const HASHNODE_API = "https://gql.hashnode.com/";
const FCC_FEED = "https://www.freecodecamp.org/news/author/LeeRenJie/rss.xml";

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchHashnodeGraphQL() {
  console.log("🔄 Trying Hashnode GraphQL API as fallback...");
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
    throw new Error("Failed to fetch Hashnode posts via GraphQL");
  }
  return data.data.user.publication.posts.map((post) => ({
    title: post.title,
    link: `https://${HASHNODE_USERNAME}.hashnode.dev/${post.slug}`,
    pubDate: post.dateAdded,
    source: "Hashnode",
  }));
}

async function fetchWithRetry(url, retries = 2, delayMs = 5000) {
  const parser = new Parser({
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Blog-Updater/1.0)'
    }
  });
  
  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) {
        console.log(`Retry ${i} for ${url}...`);
        await delay(delayMs * i);
      }
      console.log(`Fetching: ${url}`);
      const feed = await parser.parseURL(url);
      console.log(`✅ Successfully fetched ${feed.items.length} items from ${url}`);
      return feed.items;
    } catch (error) {
      console.warn(`❌ Attempt ${i + 1} failed for ${url}:`, error.message);
      if (i === retries - 1) throw error;
    }
  }
}

async function fetchHashnode() {
  try {
    console.log("🔍 Fetching Hashnode posts via RSS...");
    const items = await fetchWithRetry(HASHNODE_RSS);
    const posts = items.map((item) => ({
      title: item.title?.trim(),
      link: item.link,
      pubDate: item.pubDate,
      source: "Hashnode",
    }));
    console.log(`📝 Hashnode RSS posts found: ${posts.length}`);
    return posts;
  } catch (error) {
    console.warn("⚠️ RSS failed, trying GraphQL API...");
    try {
      const posts = await fetchHashnodeGraphQL();
      console.log(`📝 Hashnode GraphQL posts found: ${posts.length}`);
      return posts;
    } catch (apiError) {
      console.warn("⚠️ Could not fetch Hashnode posts:", apiError.message);
      return [];
    }
  }
}

async function fetchFreeCodeCamp() {
  try {
    console.log("🔍 Fetching FreeCodeCamp posts...");
    const items = await fetchWithRetry(FCC_FEED);
    const posts = items.map((item) => ({
      title: item.title?.replace(/\n/g, '').trim(),
      link: item.link,
      pubDate: item.pubDate,
      source: "freeCodeCamp",
    }));
    console.log(`📝 FreeCodeCamp posts found: ${posts.length}`);
    return posts;
  } catch (error) {
    console.warn("⚠️ Could not fetch FreeCodeCamp posts:", error.message);
    return [];
  }
}

async function main() {
  try {
    // Fetch sequentially with delays
    const hashnodePosts = await fetchHashnode();
    await delay(5000); // Wait 5 seconds
    const fccPosts = await fetchFreeCodeCamp();
    
    console.log("📊 Summary:");
    console.log(`- Hashnode: ${hashnodePosts.length} posts`);
    console.log(`- FreeCodeCamp: ${fccPosts.length} posts`);
    
    // merge and sort by date
    const allPosts = [...hashnodePosts, ...fccPosts].sort(
      (a, b) => new Date(b.pubDate) - new Date(a.pubDate)
    );
    
    console.log(`📋 Total posts before filtering: ${allPosts.length}`);
    
    // keep latest 5
    const latestFive = allPosts.slice(0, 5);
    
    console.log("🏆 Latest 5 posts:");
    latestFive.forEach((post, index) => {
      console.log(`${index + 1}. [${post.source}] ${post.title}`);
    });
    
    if (latestFive.length === 0) {
      console.warn("⚠️ No posts found from any source");
      fs.writeFileSync("blogs.json", JSON.stringify([], null, 2));
    } else {
      fs.writeFileSync("blogs.json", JSON.stringify(latestFive, null, 2));
      console.log("✅ Blogs updated successfully");
    }
  } catch (err) {
    console.error("❌ Failed to update blogs:", err);
    process.exit(1);
  }
}

main();
