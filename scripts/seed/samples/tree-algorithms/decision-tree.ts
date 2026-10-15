import type { QuestionInput } from "@/lib/types/question";

const SOLUTION = `function playTennis(days) {
  const tree = buildPlayTennisTree();
  const answers = [];
  for (const day of days) {
    answers.push(predict(tree, day));
  }
  return answers;
}

// Walks from the root to a leaf: left when day[feature] <= threshold, else right
function predict(tree, day) {
  let node = tree;
  while (node.label === undefined) {
    const value = day[node.feature];
    node = value <= node.threshold ? node.left : node.right;
  }
  return node.label;
}

// A small hand-built tree; a learning algorithm would choose these splits from data
function buildPlayTennisTree() {
  const leaf = (label) => ({ label, left: null, right: null });
  const split = (feature, threshold, left, right) => ({ feature, threshold, left, right });
  return split(
    "humidity", 75,
    split("wind", 20, leaf("yes"), leaf("no")), // normal humidity: only wind matters
    split("temp", 21, leaf("yes"), leaf("no")), // humid: fine when cool, not when hot
  );
}
`;

const DESCRIPTION = `A **decision tree** predicts an answer by asking a sequence of yes/no questions about the input. Each internal node tests one feature against a threshold (\`humidity <= 75?\`), each branch is an answer to that test, and each leaf holds a prediction. Decision trees are among the most interpretable machine-learning models, and ensembles of them (random forests, gradient boosting such as XGBoost and LightGBM) are state of the art on tabular data. This sample evaluates a small hand-built "should we play tennis?" tree on a list of days and explains how such trees are learned.

## Intuition

It is the game of twenty questions. A good first question splits the possibilities into groups that are as "pure" as possible (mostly yes or mostly no); each later question refines one group. Prediction is a single walk from the root to a leaf, and the path itself explains the answer: "humidity was 85 (> 75) and temperature 30 (> 21), so no".

\`\`\`
                humidity <= 75 ?
               /yes            \\no
       wind <= 20 ?          temp <= 21 ?
        /yes    \\no          /yes    \\no
     "yes"     "no"       "yes"     "no"
\`\`\`

## How it works

**Prediction** (what the code does)

1. Start at the root.
2. While the node is not a leaf: read \`value = day[node.feature]\`; go left if \`value <= node.threshold\`, otherwise right.
3. Return the leaf's \`label\`. \`playTennis\` repeats this for every day.

**Learning** (how the splits would be chosen from data, e.g. CART or ID3/C4.5)

1. Start with all training rows at the root.
2. For every feature and every candidate threshold, split the rows in two and measure the **impurity** of the children:
   - **Entropy:** \`H = −Σ p_c · log2 p_c\` over classes \`c\`; **information gain** = \`H(parent) − weighted average H(children)\`.
   - **Gini impurity:** \`G = 1 − Σ p_c²\`, the chance of mislabeling a random row with a random label from the node. CART picks the split with the lowest weighted Gini.
3. Keep the best split, recurse on each child.
4. Stop when a node is pure, too small, or too deep; the leaf predicts the majority class. **Pruning** later removes splits that do not help on validation data.

Example: 14 days with 9 "yes" and 5 "no" have entropy \`−(9/14)log2(9/14) − (5/14)log2(5/14) ≈ 0.940\` bits. A split whose children are purer lowers the weighted entropy; the largest drop wins.

## Walkthrough

Case 0 evaluates four days (one per leaf):

\`\`\`
day 1 {humidity 60, wind 10, temp 25}
  humidity 60 <= 75  -> left;  wind 10 <= 20  -> left   leaf "yes"
day 2 {humidity 85, wind 5, temp 30}
  humidity 85 > 75   -> right; temp 30 > 21   -> right  leaf "no"
day 3 {humidity 70, wind 30, temp 18}
  humidity 70 <= 75  -> left;  wind 30 > 20   -> right  leaf "no"
day 4 {humidity 90, wind 12, temp 18}
  humidity 90 > 75   -> right; temp 18 <= 21  -> left   leaf "yes"
answers = ["yes", "no", "no", "yes"]
\`\`\`

## Complexity

| Task | Time | Space | Why |
|------|------|-------|-----|
| predict one input | O(depth) | O(1) | one comparison per level |
| predict m inputs | O(m · depth) | O(m) | one walk per input, answers stored |
| learn (CART, greedy) | O(f · n log n · depth) | O(n) | at each level, sort each of f features and scan thresholds over n rows |

## When to use it

- **Strengths:** human-readable rules, no feature scaling needed, handles mixed numeric and categorical data and non-linear interactions, very fast prediction.
- **Weaknesses:** a single deep tree overfits and is unstable (small data changes can change the whole tree); axis-aligned splits approximate diagonal boundaries poorly.
- **vs. random forests / gradient boosting:** many trees averaged or added together are far more accurate and stable, at the cost of interpretability.
- **vs. logistic regression:** linear models extrapolate smoothly and need less data; trees capture interactions without feature engineering.
- **vs. k-nearest neighbours:** trees summarize the data into rules and predict in O(depth) instead of scanning the training set.

## Common pitfalls

- Inconsistent tie handling at the threshold: decide once whether \`value == threshold\` goes left (\`<=\`, as here) and use the same rule when learning and predicting.
- Missing features: \`day[feature]\` is \`undefined\`, and \`undefined <= 75\` is \`false\`, so the walk silently goes right. Validate inputs or learn a default direction.
- Growing the tree until every leaf is pure: perfect training accuracy, poor generalization. Limit depth or prune.
- Information gain favours features with many distinct values (like an ID); C4.5's gain ratio corrects for that.
- Comparing categorical features with \`<=\`: encode categories properly or use multiway splits.

## What to watch in the visualizer

- \`tree\` is drawn as a binary tree: internal nodes are labelled with their feature, leaves with the answer.
- In \`predict\`, \`node\` steps down one level per comparison; \`value\` shows the feature value being tested.
- \`answers\` fills with one label per day.

## Example

\`\`\`
Input: days = [
  { humidity: 60, wind: 10, temp: 25 },
  { humidity: 85, wind: 5, temp: 30 },
  { humidity: 70, wind: 30, temp: 18 },
  { humidity: 90, wind: 12, temp: 18 }
]
Output: ["yes", "no", "no", "yes"]
\`\`\`

## Constraints

- Every day has numeric \`humidity\` (%), \`wind\` (km/h) and \`temp\` (°C).
- \`0 <= days.length <= 100\`
`;

export function buildDecisionTree(): QuestionInput {
  return {
    slug: "decision-tree",
    title: "Decision Tree Evaluation",
    difficulty: "Easy",
    tags: ["tree", "machine-learning", "simulation"],
    description: DESCRIPTION,
    solutionCode: SOLUTION,
    testCases: [
      {
        method: "playTennis",
        args: [
          [
            { humidity: 60, wind: 10, temp: 25 },
            { humidity: 85, wind: 5, temp: 30 },
            { humidity: 70, wind: 30, temp: 18 },
            { humidity: 90, wind: 12, temp: 18 },
          ],
        ],
        expected: ["yes", "no", "no", "yes"],
      },
      // values exactly on a threshold go left (<=)
      {
        method: "playTennis",
        args: [
          [
            { humidity: 75, wind: 20, temp: 40 },
            { humidity: 76, wind: 0, temp: 21 },
            { humidity: 76, wind: 0, temp: 22 },
          ],
        ],
        expected: ["yes", "yes", "no"],
      },
      { method: "playTennis", args: [[]], expected: [] },
    ],
    visualHints: {
      tree: "tree",
    },
  };
}
