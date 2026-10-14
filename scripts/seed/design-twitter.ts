import { readFileSync } from "node:fs";
import path from "node:path";
import type { QuestionInput } from "@/lib/types/question";

const SOLUTION_PATH = path.join(process.cwd(), "scripts", "seed", "design-twitter.solution.txt");

const DESCRIPTION = `Design a simplified version of Twitter where users can post tweets, follow/unfollow another user, and see the \`10\` most recent tweets in the user's news feed.

Implement the \`Twitter\` class:

- \`Twitter()\` initializes your twitter object.
- \`void postTweet(int userId, int tweetId)\` composes a new tweet with ID \`tweetId\` by the user \`userId\`. Each call to this function is made with a unique \`tweetId\`.
- \`List<Integer> getNewsFeed(int userId)\` retrieves the \`10\` most recent tweet IDs in the user's news feed. Each item must be posted by users who the user followed or by the user themself. Tweets must be **ordered from most recent to least recent**.
- \`void follow(int followerId, int followeeId)\` the user with ID \`followerId\` started following the user with ID \`followeeId\`.
- \`void unfollow(int followerId, int followeeId)\` the user with ID \`followerId\` started unfollowing the user with ID \`followeeId\`.

## Example 1

\`\`\`
Input
["Twitter", "postTweet", "getNewsFeed", "follow", "postTweet", "getNewsFeed", "unfollow", "getNewsFeed"]
[[], [1, 5], [1], [1, 2], [2, 6], [1], [1, 2], [1]]
Output
[null, null, [5], null, null, [6, 5], null, [5]]
\`\`\`

## Constraints

- \`1 <= userId, followerId, followeeId <= 500\`
- \`0 <= tweetId <= 10^4\`
- All the tweets have **unique** IDs.
- At most \`3 * 10^4\` calls will be made to \`postTweet\`, \`getNewsFeed\`, \`follow\`, and \`unfollow\`.
- A user cannot follow themself.
`;

export function buildDesignTwitter(): QuestionInput {
  return {
    slug: "design-twitter",
    title: "Design Twitter",
    difficulty: "Medium",
    tags: ["design", "hash-table", "heap"],
    description: DESCRIPTION,
    solutionCode: readFileSync(SOLUTION_PATH, "utf8"),
    testCases: [
      {
        ops: ["Twitter", "postTweet", "getNewsFeed", "follow", "postTweet", "getNewsFeed", "unfollow", "getNewsFeed"],
        args: [[], [1, 5], [1], [1, 2], [2, 6], [1], [1, 2], [1]],
        expected: [null, null, [5], null, null, [6, 5], null, [5]],
      },
    ],
    visualHints: {
      "this.tweetMap": "map",
      "this.users": "map",
      minHeap: "heap",
      maxHeap: "heap",
    },
  };
}
