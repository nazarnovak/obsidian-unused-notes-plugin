A plugin for Obsidian note-taking app, which makes it easier to track and review unused notes in your vault
<img width="709" alt="Screenshot 2023-10-30 at 13 04 31" src="https://github.com/nazarnovak/obsidian-unused-notes-plugin/assets/20066923/d9d22e2a-6060-4237-8cb7-1ac75878800a">


# Why
My vault grew to 850 notes, and it was hard for me to:
- Review all the notes I have easily, and know which notes are less often opened by me
- Keep track if the information in my notes is relevant, or if I should update/delete it
- Link notes together more easily when I go through them

I searched for a simple tool like this, and couldn't find it, so I decided to build it  
After using it for 2 weeks daily in the morning, I found it very useful and wanted to share it with others
# Features
<img width="1061" alt="main" src="https://github.com/nazarnovak/obsidian-unused-notes-plugin/assets/20066923/53d89be5-b6f0-4142-a562-2d13bb102325">

## The main plugin modal window
I've marked the plugin and modal window with numbers in blue circles, so it's easier to follow along
1. Unused Notes icon, that brings up the modal with the unused notes
2. Opens 1 random note from the oldest 100 notes you have (and closes the modal window). There's also a hint on the left of the button what it does
3. Grouping of the notes by day (Never used will transform into "2022-08-16" for example as a header for the note, and all the notes you last opened on that date will be shown under that header)
4. Pressing/tapping the [X] on the left of the note will stop tracking it as unused and remove it from the list in the modal (for example, I have some images that I use in my notes. And while I want to review my notes, I don't want to review the images, so I mark them to be ignored for usage tracking. You can also enable tracking later from the context menu if you want)
5. Pressing/tapping on the title of the note will open the note (and close the modal window)

## The context menu
### Desktop
<img width="310" alt="Screenshot 2023-10-30 at 13 11 52" src="https://github.com/nazarnovak/obsidian-unused-notes-plugin/assets/20066923/2513819e-7a16-4823-b097-bc959bb9ec41">

### Mobile
<img width="310" alt="Screenshot 2023-10-30 at 13 11 53" src="https://github.com/nazarnovak/obsidian-unused-notes-plugin/assets/20066923/37961089-6cc8-49c7-9c46-4b594e3bdc05">

From the context menu you can choose to:
- Disable usage tracking (same as number 4 in the modal above. If you change your mind, the disabled note will have "Enable usage tracking" which you can click/tap)
- Reset usage - sometimes I'm reviewing a note in the morning, and realize that it's a lot of things to review, so I reset usage so I can put it back as an "Unused note", and review it later. Sometimes I just like a note a lot and wanna review it later - so I reset usage as well

## Settings
<img width="1008" alt="Screenshot 2023-10-30 at 13 12 14" src="https://github.com/nazarnovak/obsidian-unused-notes-plugin/assets/20066923/d70682a9-88e4-4fa6-ad95-249ae8047783">
Here you can specify the number of days, when you consider a note "unused". For me, since I have 850 notes, I put 60 days, but I'll probably increase the number of days the more notes I have in my valut

# How to install
1. Download the files in this repository to your computer
2. Find your vault folder, and go to `.obsidian/plugins`
3. You can create a `unused-notes-tracker` folder here
4. Open the `unused-notes-tracker` folder, and paste the files into it
5. Now when you go to Settings -> Community plugins, you'll see "Unused Notes Tracker" plugin, which you can enable

If enough people are interested in this - I'm happy to publish it officially, since it takes a bit more work to do that and jump through all the hoops there, but for now I thought it would be great to see if people care about this at all, and if you have the interest to use it for a bit - maybe you find some bug I missed! :D
Happy Obsidianing!
