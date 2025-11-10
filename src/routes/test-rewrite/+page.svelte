<script lang="ts">
	import { onMount } from 'svelte';

	interface TestResult {
		success: boolean;
		original: string;
		rewritten: string | null;
		apiKeySet: boolean;
		error?: string;
		changed?: boolean;
	}

	const testCases = [
		'Take one per day',
		'once daily',
		'two tablets by mouth twice a day',
		'Take 1 tablt twic daily',
		'1 pill 2x per day',
		'Take two capsules every eight hours',
		'one tablet daily with food',
		'Take 1 tablet twice daily', // Should return unchanged
		'three pills every 6 hours',
		'1 cap daily',
	];

	let results: Record<string, TestResult> = {};
	let loading: Record<string, boolean> = {};
	let apiKeyStatus: boolean | null = null;

	async function testRewrite(sig: string) {
		loading[sig] = true;
		try {
			const response = await fetch(`/api/test-rewrite?sig=${encodeURIComponent(sig)}`);
			const result: TestResult = await response.json();
			results[sig] = result;
			if (apiKeyStatus === null) {
				apiKeyStatus = result.apiKeySet;
			}
		} catch (error) {
			results[sig] = {
				success: false,
				original: sig,
				rewritten: null,
				apiKeySet: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		} finally {
			loading[sig] = false;
		}
	}

	async function testAll() {
		for (const sig of testCases) {
			await testRewrite(sig);
			// Small delay to avoid rate limits
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	}

	onMount(() => {
		// Test first case on mount to check API key status
		testRewrite(testCases[0]);
	});
</script>

<div class="container mx-auto p-8 max-w-4xl">
	<h1 class="text-3xl font-bold mb-6">SIG Rewrite Test Page</h1>

	{#if apiKeyStatus === false}
		<div class="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-6">
			<strong>⚠️ API Key Not Set:</strong> OPENAI_API_KEY environment variable is not set. 
			The rewrite function will return null. Please set the API key to test the rewrite functionality.
		</div>
	{:else if apiKeyStatus === true}
		<div class="bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded mb-6">
			<strong>✅ API Key Set:</strong> Rewrite functionality is enabled.
		</div>
	{/if}

	<div class="mb-6">
		<button
			on:click={testAll}
			class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
			disabled={Object.values(loading).some((l) => l)}
		>
			{Object.values(loading).some((l) => l) ? 'Testing...' : 'Test All Examples'}
		</button>
	</div>

	<div class="space-y-4">
		{#each testCases as sig}
			<div class="border rounded-lg p-4">
				<div class="flex items-center justify-between mb-2">
					<h3 class="font-semibold text-lg">"{sig}"</h3>
					<button
						on:click={() => testRewrite(sig)}
						class="bg-gray-500 hover:bg-gray-700 text-white text-sm py-1 px-3 rounded"
						disabled={loading[sig]}
					>
						{loading[sig] ? 'Testing...' : 'Test'}
					</button>
				</div>

				{#if results[sig]}
					{#if results[sig].success}
						<div class="bg-green-50 border border-green-200 rounded p-3 mt-2">
							<p class="text-sm">
								<strong>✅ Success:</strong> "{results[sig].rewritten}"
							</p>
							{#if results[sig].changed === false}
								<p class="text-xs text-gray-600 mt-1">(No change needed)</p>
							{/if}
						</div>
					{:else if results[sig].error && results[sig].error.includes('no change needed')}
						<div class="bg-blue-50 border border-blue-200 rounded p-3 mt-2">
							<p class="text-sm">
								<strong>ℹ️ No Rewrite Needed:</strong> SIG is already in correct format
							</p>
							<p class="text-xs text-gray-600 mt-1">Original: "{results[sig].original}"</p>
						</div>
					{:else}
						<div class="bg-red-50 border border-red-200 rounded p-3 mt-2">
							<p class="text-sm">
								<strong>❌ Failed:</strong> {results[sig].error || 'Unknown error'}
							</p>
							{#if results[sig].apiKeySet === false}
								<p class="text-xs text-gray-600 mt-1">API key not set</p>
							{/if}
						</div>
					{/if}
				{/if}
			</div>
		{/each}
	</div>

	<div class="mt-8 p-4 bg-gray-100 rounded">
		<h2 class="font-bold mb-2">Expected Results:</h2>
		<ul class="list-disc list-inside space-y-1 text-sm">
			<li><strong>"Take one per day"</strong> → "Take 1 tablet once daily"</li>
			<li><strong>"once daily"</strong> → "Take 1 tablet once daily"</li>
			<li><strong>"two tablets by mouth twice a day"</strong> → "Take 2 tablets by mouth twice daily"</li>
			<li><strong>"Take 1 tablt twic daily"</strong> → "Take 1 tablet twice daily"</li>
			<li><strong>"1 pill 2x per day"</strong> → "Take 1 tablet twice daily"</li>
			<li><strong>"Take two capsules every eight hours"</strong> → "Take 2 capsules every 8 hours"</li>
			<li><strong>"one tablet daily with food"</strong> → "Take 1 tablet once daily with food"</li>
			<li><strong>"Take 1 tablet twice daily"</strong> → (unchanged or null)</li>
			<li><strong>"three pills every 6 hours"</strong> → "Take 3 tablets every 6 hours"</li>
			<li><strong>"1 cap daily"</strong> → "Take 1 capsule once daily"</li>
		</ul>
	</div>
</div>

<style>
	.container {
		font-family: system-ui, -apple-system, sans-serif;
	}
</style>

