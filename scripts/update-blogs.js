import Parser from 'rss-parser';
import fs from 'fs';
import fetch from 'node-fetch';

const HASHNODE_USERNAME = "leerenjie";
const HASHNODE_API = "https://gql.hashnode.com/";
const HASHNODE_HOST = `${HASHNODE_USERNAME}.hashnode.dev`;
const FCC_FEED = "https://www.freecodecamp.org/news/author/LeeRenJie/rss.xml";

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchHashnodeGraphQL() {
  console.log("🔍 Fetching Hashnode posts via GraphQL...");
  const query = `
    query Publication {
      publication(host: "${HASHNODE_HOST}") {
        posts(first: 10) {
          edges {
            node {
              title
              brief
              slug
              publishedAt
              url
            }
          }
        }
      }
    }
  `;
  
  const res = await fetch(HASHNODE_API, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "User-Agent": "Blog-Updater/1.0"
    },
    body: JSON.stringify({ query }),
  });
  
  const data = await res.json();
  
  if (!data.data?.publication?.posts?.edges) {
    throw new Error("Failed to fetch Hashnode posts via GraphQL");
  }
  
  const posts = data.data.publication.posts.edges.map((edge) => ({
    title: edge.node.title,
    link: edge.node.url,
    pubDate: edge.node.publishedAt,
    source: "Hashnode",
  }));
  
  console.log(`📝 Hashnode GraphQL posts found: ${posts.length}`);
  return posts;
}

async function fetchFreeCodeCamp() {
  console.log("🔍 Fetching FreeCodeCamp posts...");
  const parser = new Parser({
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Blog-Updater/1.0)'
    }
  });
  
  try {
    const feed = await parser.parseURL(FCC_FEED);
    const posts = feed.items.map((item) => ({
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

function updateReadme(posts) {
  console.log("📝 Updating README.md...");
  
  try {
    let readmeContent = fs.readFileSync('README.md', 'utf-8');
    
    // Create blog posts section with source labels
    const blogSection = posts
      .map(post => `- [${post.source}] [${post.title}](${post.link})`)
      .join('\n');
    
    const newBlogSection = `<!-- BLOG-POST-LIST:START -->\n${blogSection}\n<!-- BLOG-POST-LIST:END -->`;
    
    // Replace existing blog section or add it if it doesn't exist
    if (readmeContent.includes('<!-- BLOG-POST-LIST:START -->')) {
      readmeContent = readmeContent.replace(
        /<!-- BLOG-POST-LIST:START -->[\s\S]*?<!-- BLOG-POST-LIST:END -->/,
        newBlogSection
      );
    } else {
      // If no blog section exists, add it at the end
      readmeContent += '\n\n### Recent Articles📖\n' + newBlogSection;
    }
    
    fs.writeFileSync('README.md', readmeContent);
    console.log("✅ README.md updated successfully");
  } catch (error) {
    console.error("❌ Failed to update README.md:", error.message);
  }
}

async function main() {
  try {
    // Fetch from both sources
    const hashnodePosts = await fetchHashnodeGraphQL();
    await delay(3000); // Wait between requests
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
    } else {
      // Save to JSON
      fs.writeFileSync("blogs.json", JSON.stringify(latestFive, null, 2));
      
      // Update README
      updateReadme(latestFive);
      
      console.log("✅ Blogs updated successfully");
    }
  } catch (err) {
    console.error("❌ Failed to update blogs:", err);
    process.exit(1);
  }
}

main();
