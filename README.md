# Best Price Picker

This project is ready to host on GitHub Pages as a static site.

## What Works on GitHub Pages

- `index.html` is the site entry point.
- Excel and CSV parsing happen in the browser using CDN libraries.
- No backend server is required.

## Publish Steps

1. Create a new GitHub repository.
2. Upload these project files to the repository root.
3. Make sure the default branch is named `main`.
4. Push the code to GitHub.
5. In GitHub, open `Settings > Pages`.
6. Under `Build and deployment`, choose `GitHub Actions`.
7. Wait for the `Deploy to GitHub Pages` workflow to finish.
8. Open the site at:

`https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPOSITORY_NAME/`

## Files Added for Deployment

- `.github/workflows/deploy.yml` deploys the site automatically on push to `main`.
- `.nojekyll` ensures GitHub Pages serves the files directly.

## Notes

- Keep `index.html` in the repository root.
- Relative paths already work for GitHub Pages.
- The uploaded Excel or CSV file is processed locally in the visitor's browser.
