const API_BASE =
  "https://port-0-back-end-micz9ngy8b0679ee.sel3.cloudtype.app";

const EMAIL = "user@example.com";
const PASSWORD = "secret123";

// 처음에는 100으로 테스트하고, 괜찮으면 1000으로 늘리기
const TEST_COUNT = 1000;

// 찾고 싶은 추천 레시피명
const TARGET_RECIPE_NAME = "흑임자죽";

async function login() {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
    }),
  });

  if (!res.ok) {
    throw new Error(`로그인 실패: ${res.status} ${await res.text()}`);
  }

  const body = await res.json();
  return body.data.access_token;
}

async function fetchRecommendedRecipes(token) {
  const start = performance.now();

  const res = await fetch(`${API_BASE}/api/v1/recipes?limit=20`, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const end = performance.now();
  const elapsedMs = end - start;

  if (!res.ok) {
    throw new Error(`추천 API 실패: ${res.status} ${await res.text()}`);
  }

  const body = await res.json();
  const items = body.data?.items ?? [];

  const hasTargetRecipe = items.some((recipe) =>
    recipe.name.includes(TARGET_RECIPE_NAME)
  );

  return {
    elapsedMs,
    recipeCount: items.length,
    hasTargetRecipe,
    firstRecipeName: items[0]?.name ?? "",
  };
}

function calculateStats(times) {
  const sorted = [...times].sort((a, b) => a - b);
  const sum = times.reduce((acc, cur) => acc + cur, 0);

  const avg = sum / times.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = sorted[Math.floor(sorted.length / 2)];

  return { avg, min, max, median };
}

async function main() {
  console.log("로그인 중...");
  const token = await login();

  console.log(`추천 API 속도 측정 시작: ${TEST_COUNT}회`);
  console.log(`대상 레시피: ${TARGET_RECIPE_NAME}`);
  console.log("");

  const times = [];
  let successCount = 0;
  let targetFoundCount = 0;

  for (let i = 0; i < TEST_COUNT; i++) {
    try {
      const result = await fetchRecommendedRecipes(token);

      times.push(result.elapsedMs);
      successCount++;

      if (result.hasTargetRecipe) {
        targetFoundCount++;
      }

      console.log(
        `${i + 1}/${TEST_COUNT}회 | ${result.elapsedMs.toFixed(
          2
        )} ms | 추천 ${result.recipeCount}개 | 첫 번째: ${
          result.firstRecipeName
        } | 흑임자죽 포함: ${result.hasTargetRecipe ? "O" : "X"}`
      );
    } catch (e) {
      console.log(`${i + 1}/${TEST_COUNT}회 실패: ${e.message}`);
    }

    // 서버에 너무 빠르게 연속 요청하지 않도록 아주 짧게 쉬기
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  const stats = calculateStats(times);

  console.log("");
  console.log("===== 최종 결과 =====");
  console.log(`총 시도 횟수: ${TEST_COUNT}`);
  console.log(`API 성공 횟수: ${successCount}/${TEST_COUNT}`);
  console.log(`흑임자죽 추천 성공 횟수: ${targetFoundCount}/${TEST_COUNT}`);
  console.log(`평균 응답 시간: ${stats.avg.toFixed(2)} ms`);
  console.log(`중앙값 응답 시간: ${stats.median.toFixed(2)} ms`);
  console.log(`최소 응답 시간: ${stats.min.toFixed(2)} ms`);
  console.log(`최대 응답 시간: ${stats.max.toFixed(2)} ms`);

  console.log("");
  console.log("표에 넣을 값:");
  console.log(
    `Our system | 흑임자죽 재료 포함 재고 19개 | ${TEST_COUNT}회 | 평균 ${stats.avg.toFixed(
      2
    )} ms | 최소 ${stats.min.toFixed(2)} ms | 최대 ${stats.max.toFixed(
      2
    )} ms | 흑임자죽 ${targetFoundCount}/${TEST_COUNT}회 추천`
  );
}

main().catch((err) => {
  console.error("실행 중 오류 발생:");
  console.error(err);
});