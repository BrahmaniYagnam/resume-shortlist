import httpx

from app.services.ai_service import analyze_github_profile


async def fetch_github_profile(username: str, token: str = "") -> dict:
    headers = {"Accept": "application/vnd.github.v3+json"}
    if token:
        headers["Authorization"] = f"token {token}"

    async with httpx.AsyncClient(timeout=30) as client:
        user_resp = await client.get(f"https://api.github.com/users/{username}", headers=headers)
        if user_resp.status_code != 200:
            return {"error": f"GitHub user '{username}' not found"}

        user_data = user_resp.json()
        repos_resp = await client.get(
            f"https://api.github.com/users/{username}/repos?sort=updated&per_page=30",
            headers=headers,
        )
        repos = repos_resp.json() if repos_resp.status_code == 200 else []

    repos_data = []
    for repo in repos:
        if isinstance(repo, dict) and "name" in repo:
            repos_data.append({
                "name": repo.get("name"),
                "description": repo.get("description", ""),
                "language": repo.get("language"),
                "stars": repo.get("stargazers_count", 0),
                "forks": repo.get("forks_count", 0),
                "topics": repo.get("topics", []),
                "has_wiki": repo.get("has_wiki", False),
                "updated_at": repo.get("updated_at", ""),
            })

    analysis = await analyze_github_profile(repos_data, username)

    return {
        "username": username,
        "profile": {
            "name": user_data.get("name"),
            "bio": user_data.get("bio"),
            "public_repos": user_data.get("public_repos", 0),
            "followers": user_data.get("followers", 0),
            "following": user_data.get("following", 0),
            "avatar_url": user_data.get("avatar_url"),
        },
        "repos": repos_data,
        "analysis": analysis,
    }
