Verify node installation (https://nodejs.org/):
node -v
npm -v

Install Angular CLI:
npm install -g @angular/cli

Verify Angular CLI with:
ng version

Verify dotnet (https://dotnet.microsoft.com/en-us/download/dotnet/thank-you/sdk-8.0.403-windows-x64-installer):
dotnet --version

Download and Install PostgreSQL (Install the pgAdmin for a graphical interface) (Currently on Version 17.0)
https://www.postgresql.org/download/
Port is on: 5432
Password is: admin

Install Tailwind:
cd Frontend
npm install -D tailwindcss postcss autoprefixer

Install Tailwind Intellisense in Extensions:
Tailwind CSS IntelliSense

Trust the Dotnet Developer Certificate:
dotnet dev-certs https --trust

To rebuild for the serve do thse commands:
# 1. Delete the old build output in the backend public directory
Remove-Item -Recurse -Force D:\Coding\DungeonLair\DungeonLair\Backend\public


# 2. Build your Angular app (remember to cd into frontend)
npm run build

# 3. Copy the new build output to the backend public directory
xcopy /E /I /Y D:\Coding\DungeonLair\DungeonLair\Frontend\dist\frontend D:\Coding\DungeonLair\DungeonLair\Backend\public

Or if you want all at the same time do this:
Remove-Item -Recurse -Force D:\Coding\DungeonLair\DungeonLair\Backend\public; npm run build; xcopy /E /I /Y D:\Coding\DungeonLair\DungeonLair\Frontend\dist\frontend D:\Coding\DungeonLair\DungeonLair\Backend\public