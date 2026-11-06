console.log("[Scratch Design Addon] Loaded")

function timeAgo(dateString, locale = 'en') {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'always'});

    const units = [
        { unit: "year", seconds: 31536000 },
        { unit: "month", seconds: 2592000 },
        { unit: "day", seconds: 86400 },
        { unit: "hour", seconds: 36000 },
        { unit: "minute", seconds: 60 },
        { unit: "second", seconds: 1 },
    ];

    for (const { unit, seconds: unitSeconds} of units) {
        const count = Math.floor(seconds / unitSeconds);
        if (count >= 1) {
            return rtf.format(-count, unit);
        }
    }

    return "just now"
}

function waitForElement(selector, timeout = 8000) {
    return new Promise((resolve) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);

        const obs = new MutationObserver(() => {
            const match = document.querySelector(selector);
            if (match) {
                obs.disconnect();
                clearTimeout(timer);
                resolve(match);
            }
        });

        obs.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        const timer = setTimeout(() => {
            obs.disconnect();
            resolve(null);
        }, timeout);
    });
}

function waitForUsername() {
    return new Promise((resolve) => {
        const selector = "#navigation .account-nav .user-info .profile-name, #navigation > div > ul > li.link.right.account-nav span";

        const interval = setInterval(() => {
            const el = document.querySelector(selector);
            const name = el?.textContent?.trim();

            if (name && name.length > 0) {
                clearInterval(interval);
                resolve(name);
            }
        }, 50);

        setTimeout(() => {
            clearInterval(interval);
            resolve(null);
        }, 6000);
    });
}

// Fetches all projects (including loves, favorites & views) of the user
async function fetchAllProjects() {
    let projects = [];
    try {
        let page = 1
        while (true) {
            req = await fetch(`https://scratch.mit.edu/site-api/projects/all/?page=${page}`, {
                method: "GET"
            })
            if (req.ok) {
                const result = await req.json();
                if(!Array.isArray(result) || result.length == 0) { break };
                projects.push(...result);
            } else { break }
            page += 1;
        }

        let stats = {
            total_loves: 0,
            total_favs: 0,
            total_views: 0,
        }

        for (const project of projects) {
            stats.total_loves += project.fields.love_count;
            stats.total_favs += project.fields.favorite_count;
            stats.total_views += project.fields.view_count;
        }  

        const old_total_loves = localStorage.getItem("total_loves") || 0;
        const old_total_favs = localStorage.getItem("total_favs") || 0;
        const old_total_views = localStorage.getItem("total_views") || 0;

        document.getElementById("new-loves").textContent = "+" + (stats.total_loves - old_total_loves).toString() + " loves"
        document.getElementById("new-favs").textContent = "+" + (stats.total_favs - old_total_favs).toString() + " favorites"
        document.getElementById("new-views").textContent = "+" + (stats.total_views - old_total_views).toString() + " views"
        
        document.getElementById("total-loves").textContent = stats.total_loves + " total"
        document.getElementById("total-favs").textContent = stats.total_favs + " total"
        document.getElementById("total-views").textContent = stats.total_views + " total"

        localStorage.setItem("total_loves", stats.total_loves)
        localStorage.setItem("total_favs", stats.total_favs)
        localStorage.setItem("total_views", stats.total_views)

        return stats;
    } catch {
        console.log("Crashed.")
    }
}

async function fetchUserData() {
    const name = await waitForUsername();
    let count = 0;
    if(!name) return(null);
    try {
        const req = await fetch(`https://scratch.mit.edu/users/${name}/followers/`)
        const html = await req.text();

        const match = html.match(/\s*\(([\d,.]+)\)/i);
        if (match) {
            count = parseInt(match[1].replace(/[,.]/g, ''), 10)
        }

        document.getElementById("total-followers").textContent = count.toString() + " total"
        const old_total_followers = localStorage.getItem("followers") || 0;
        document.getElementById("new-followers").textContent = "+" + (old_total_followers - count).toString() + " followers"
        localStorage.setItem("followers", count)
    } catch {
        console.log("Something happened!")
    }
}

async function tryInjectingBoxes() {
    function generateBtn(name, id, className, parent, handler = false) {
        let button = document.createElement('button');
        button.textContent = name;
        button.id = id;
        button.className = className;

        if (handler) {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                handler();
            })
        }

        parent.appendChild(button);
    }

    function generateDashboardTab() {
        let div = document.createElement('div');
        div.className = "stats-content injected-content"

        let lovesDiv = document.createElement('div');
        let redCircle = document.createElement('span');
        redCircle.className = "circle red"
        let heartIcon = document.createElement('img');
        heartIcon.src = chrome.runtime.getURL("assets/heart.png")
        heartIcon.className = "icon"
        redCircle.appendChild(heartIcon)
        let newLoves = document.createElement('p');
        newLoves.className = "newstats"
        newLoves.id = "new-loves"
        newLoves.textContent = "0"
        let totalLoves = document.createElement('p');
        totalLoves.className = "totalstats"
        totalLoves.id = "total-loves"
        totalLoves.textContent = "0"
        lovesDiv.append(redCircle, newLoves, totalLoves);

        let favsDiv = document.createElement('div');
        let yellowCircle = document.createElement('span');
        yellowCircle.className = "circle yellow"
        let favIcon = document.createElement('img');
        favIcon.src = chrome.runtime.getURL("assets/star.png")
        favIcon.className = "icon"
        yellowCircle.appendChild(favIcon)
        let newFavs = document.createElement('p');
        newFavs.className = "newstats"
        newFavs.id = "new-favs"
        newFavs.textContent = "0"
        let totalFavs = document.createElement('p');
        totalFavs.className = "totalstats"
        totalFavs.id = "total-favs"
        totalFavs.textContent = "0"
        favsDiv.append(yellowCircle, newFavs, totalFavs);

        let followersDiv = document.createElement('div');
        let blueCircle = document.createElement('span');
        blueCircle.className = "circle blue"
        let followerIcon = document.createElement('img');
        followerIcon.src = chrome.runtime.getURL("assets/person.png")
        followerIcon.className = "icon"
        blueCircle.appendChild(followerIcon)
        let newFollowers = document.createElement('p');
        newFollowers.className = "newstats"
        newFollowers.id = "new-followers"
        newFollowers.textContent = "0"
        let totalFollowers = document.createElement('p');
        totalFollowers.className = "totalstats"
        totalFollowers.id = "total-followers"
        totalFollowers.textContent = "0"
        followersDiv.append(blueCircle, newFollowers, totalFollowers);

        let viewsDiv = document.createElement('div');
        let grayCircle = document.createElement('span');
        grayCircle.className = "circle gray"
        let viewIcon = document.createElement('img');
        viewIcon.src = chrome.runtime.getURL("assets/eye.png")
        viewIcon.className = "icon"
        grayCircle.appendChild(viewIcon)
        let newViews = document.createElement('p');
        newViews.className = "newstats"
        newViews.id = "new-views"
        newViews.textContent = "0"
        let totalViews = document.createElement('p');
        totalViews.className = "totalstats"
        totalViews.id = "total-views"
        totalViews.textContent = "0"
        viewsDiv.append(grayCircle, newViews, totalViews);

        div.append(lovesDiv, favsDiv, followersDiv, viewsDiv);
        return div;
    }

    async function generateWhatsHappening() {
        const data = await fetch(`https://api.scratch.mit.edu/users/BF-Scratching/following/users/activity?limit=5`)
        const div = document.createElement('div');
        div.className = "box-content news-box-content";
        if (data.ok) {
            const results = await data.json();
            
            for (const result of results) {
                const row = document.createElement('div');

                const pfp  = `https://uploads.scratch.mit.edu/get_image/user/${result.actor_id}_1024x1024.png`
                const pfpEl = document.createElement('img');
                pfpEl.src = pfp;
                pfpEl.className = "activity-pfp"

                const mainText = document.createElement('p');
                
                const linkToAcc = document.createElement('a');
                linkToAcc.href = "https://scratch.mit.edu/users/" + result.actor_username;
                const usertext = document.createElement('span');
                usertext.textContent = result.actor_username;
                usertext.className = "user-text"
                linkToAcc.appendChild(usertext);

                const actionText = document.createElement('span');
                actionText.className = "action-text"
                switch(result.type) {
                    case 'loveproject':
                        actionText.textContent = " loved ";
                        break;
                    case 'favoriteproject':
                        actionText.textContent = " favorited ";
                        break;
                }

                const projectText = document.createElement('span');
                projectText.textContent = result.title || result.project_title;
                projectText.className = "project-text"

                const time = document.createElement('p');
                time.textContent = timeAgo(result.datetime_created);
                time.className = "activity-time"

                mainText.appendChild(linkToAcc);
                mainText.appendChild(actionText);
                mainText.appendChild(projectText);
                mainText.className = "activity-main-text"
                
                const main = document.createElement('div');
                main.appendChild(mainText)
                main.appendChild(time)
                main.className = "activity-text-div"
                
                row.appendChild(pfpEl);
                row.className = "activity-row"
                row.appendChild(main);
                div.appendChild(row);
            }
        }
        return div;
    }

    let designStudioProjects = null;
    let featuredStudios = null;

    async function generateFeaturedProjects(blueBoxContent) {
        const result = await fetch('https://api.scratch.mit.edu/proxy/featured');
        if (result.ok) {
            data = await result.json();
            const featuredProjects = data.community_featured_projects;
            featuredStudios = data.community_featured_studios;
            designStudioProjects = data.scratch_design_studio;
            
            const grid = document.createElement('div');
            grid.className = "grid-list"
            
            featuredProjects.forEach((project) => {
                const card = document.createElement('div');
                card.className = "list-card"
                
                const a = document.createElement('a');
                a.href = "/projects/" + project.id
                const img = document.createElement('img')
                img.src = project.thumbnail_url;
                img.className = "project-thumb"
                a.appendChild(img);
                card.appendChild(a);

                const textDiv = document.createElement('div');
                const title = document.createElement('a');
                title.href = "/projects/" + project.id;
                title.textContent = project.title;
                title.className = "project-title";
                const authorSection = document.createElement('div');
                authorSection.className = "project-author-section"
                const author = document.createElement('a');
                author.href = "/users/" + project.creator;
                author.textContent = project.creator;
                author.className = "project-author";
                const authorpfp = document.createElement('img');
                authorpfp.src = `https://uploads.scratch.mit.edu/get_image/user/${project.creator_id}_1024x1024.png`
                authorpfp.className = "project-author-pfp"
                authorSection.appendChild(authorpfp);
                authorSection.appendChild(author);

                textDiv.appendChild(title);
                textDiv.appendChild(authorSection);
                card.appendChild(textDiv);
                
                grid.appendChild(card)
            })
            blueBoxContent.innerHTML = "";
            blueBoxContent.appendChild(grid)

            return grid;

        } else {
            console.log("Failed fetching featured projects.")
            return null;
        }
    }

    function generateFeaturedStudios() {
        if (featuredStudios) {
            const grid = document.createElement('div');
            grid.className = "grid-list"
            featuredStudios.forEach((studio) => {
                const card = document.createElement('div');
                card.className = "list-card"
                
                const a = document.createElement('a');
                a.href = "/studios/" + studio.id
                const img = document.createElement('img')
                img.src = studio.thumbnail_url;
                img.className = "project-thumb"
                a.appendChild(img);
                card.appendChild(a);

                const textDiv = document.createElement('div');
                const title = document.createElement('a');
                title.href = "/studios/" + studio.id;
                title.textContent = studio.title;
                title.className = "project-title";

                textDiv.appendChild(title);
                card.appendChild(textDiv);
                
                grid.appendChild(card)
            });

            return grid;
        } else {
            console.log("Failed fetching featured studios.")
            return null;
        }
    }

    async function generateProjectsLovedByScratchersImFollowing(username) {
        const result = await fetch(`https://api.scratch.mit.edu/users/${username}/following/users/loves`);
        if (result.ok) {
            const data = await result.json();

            const grid = document.createElement('div');
            grid.className = "grid-list"
            
            data.forEach((project) => {
                const card = document.createElement('div');
                card.className = "list-card"
                
                const a = document.createElement('a');
                a.href = "/projects/" + project.id
                const img = document.createElement('img')
                img.src = project.image;
                img.className = "project-thumb"
                a.appendChild(img);
                card.appendChild(a);

                const textDiv = document.createElement('div');
                const title = document.createElement('a');
                title.href = "/projects/" + project.id;
                title.textContent = project.title;
                title.className = "project-title";
                const authorSection = document.createElement('div');
                authorSection.className = "project-author-section"
                const author = document.createElement('a');
                author.href = "/users/" + project.author.username;
                author.textContent = project.author.username;
                author.className = "project-author";
                const authorpfp = document.createElement('img');
                authorpfp.src = `https://uploads.scratch.mit.edu/get_image/user/${project.author.id}_1024x1024.png`
                authorpfp.className = "project-author-pfp"
                authorSection.appendChild(authorpfp);
                authorSection.appendChild(author);

                textDiv.appendChild(title);
                textDiv.appendChild(authorSection);
                card.appendChild(textDiv);
                
                grid.appendChild(card)
            })
            const redBoxContent = await waitForElement("#view > div > div:nth-child(2) > div:nth-child(1) > div.box-content")
            redBoxContent.innerHTML = "";
            redBoxContent.className = "red-box-content"
            redBoxContent.appendChild(grid)

            const redBox = document.querySelector("#view > div > div:nth-child(2) > div:nth-child(1)");
            redBox.className = "box red-box"

            const redBoxHeader = document.querySelector("#view > div > div:nth-child(2) > div:nth-child(1) > div.box-header")
            redBoxHeader.querySelector("h4").remove();
            redBoxHeader.className = "red-box-header"
            redBoxHeader.querySelector("p").remove();
            generateBtn("Projects Loved by Scratcher I'm Following", "projects-loved-by-scratchers", "red-tab-btn", redBoxHeader)
        } else {
            console.log("Failed fetching featured projects.")
            return null;
        }
    }

    async function generateDesignStudio() {
        console.log(designStudioProjects)
        if (designStudioProjects) {
            const grid = document.createElement('div');
            grid.className = "grid-list"
            
            designStudioProjects.forEach((project) => {
                const card = document.createElement('div');
                card.className = "list-card"
                
                const a = document.createElement('a');
                a.href = "/studios/" + project.id
                const img = document.createElement('img')
                img.src = project.thumbnail_url;
                img.className = "project-thumb"
                a.appendChild(img);
                card.appendChild(a);

                const textDiv = document.createElement('div');
                const title = document.createElement('a');
                title.href = "/studios/" + project.id;
                title.textContent = project.title;
                title.className = "project-title";
                const authorSection = document.createElement('div');
                authorSection.className = "project-author-section"
                const author = document.createElement('a');
                author.href = "/users/" + project.creator;
                author.textContent = project.creator;
                author.className = "project-author";
                const authorpfp = document.createElement('img');
                authorpfp.src = `https://uploads.scratch.mit.edu/get_image/user/${project.creator_id}_1024x1024.png`
                authorpfp.className = "project-author-pfp"
                authorSection.appendChild(authorpfp);
                authorSection.appendChild(author);
                
                textDiv.appendChild(title);
                textDiv.appendChild(authorSection)
                card.appendChild(textDiv);
                
                grid.appendChild(card)
            })
            const greenBoxContent = await waitForElement("#view > div > div:nth-child(2) > div:nth-child(2) > div.box-content")
            greenBoxContent.innerHTML = "";
            greenBoxContent.className = "green-box-content"
            greenBoxContent.appendChild(grid)
            document.querySelector("#view > div > div:nth-child(2)").classList += " lower-part"

            const greenBox = document.querySelector("#view > div > div:nth-child(2) > div:nth-child(2)");
            greenBox.className = "box green-box"

            const greenBoxHeader = document.querySelector("#view > div > div:nth-child(2) > div:nth-child(2) > div.box-header")
            greenBoxHeader.querySelector("h4").remove();
            greenBoxHeader.className = "green-box-header"
            generateBtn("Scratch Design Studio ● " + designStudioProjects[0].gallery_title, "scratch-design-studio", "green-tab-btn", greenBoxHeader)
        } else {
            console.log("Failed fetching featured projects.")
            return null;
        }
    }

    function generateNewFooter() {
        const footer = document.createElement('div');
        footer.className = "footer";
        
        const logo = document.createElement('img')
        logo.className = "logo"
        logo.src = "/images/logo_sm.png";

        const buttons = document.createElement('ul');
        buttons.className = "footer-buttons"
        const aboutLink = document.createElement('a');
        aboutLink.href = "/about";
        const aboutBtn = document.createElement('li');
        aboutBtn.className = "footer-btn";
        aboutBtn.appendChild(aboutLink);
        const aboutText = document.createElement('span');
        aboutText.textContent = "About";
        aboutText.className = "footer-text"
        aboutLink.appendChild(aboutText)

        const communityLink = document.createElement('a');
        communityLink.href = "/discuss"
        const communityBtn = document.createElement('li');
        communityBtn.className = "footer-btn";
        communityBtn.appendChild(communityLink)
        const communityText = document.createElement('span');
        communityText.textContent = "Community";
        communityText.className = "footer-text"
        communityLink.appendChild(communityText);

        const resourceLink = document.createElement('a');
        resourceLink.href = "/starter-projects"
        const resourceBtn = document.createElement('li');
        resourceBtn.className = "footer-btn";
        resourceBtn.appendChild(resourceLink)
        const resourceText = document.createElement('span');
        resourceText.textContent = "Resources";
        resourceText.className = "footer-text"
        resourceLink.appendChild(resourceText)


        const legalLink = document.createElement('a');
        legalLink.href = "https://mitscratch.freshdesk.com/en/support/solutions/articles/4000219182-scratch-terms-of-service"
        const legalBtn = document.createElement('li');
        legalBtn.className = "footer-btn";
        legalBtn.appendChild(legalLink)
        const legalText = document.createElement('span');
        legalText.textContent = "Legal";
        legalText.className = "footer-text"
        legalLink.appendChild(legalText)


        const familyLink = document.createElement('a');
        familyLink.href = "https://en.scratch-wiki.info/wiki/Scratch_Family#Scratch_Day"
        const familyBtn = document.createElement('li');
        familyBtn.className = "footer-btn";
        familyBtn.appendChild(familyLink)
        const familyText = document.createElement('span');
        familyText.textContent = "Scratch Family";
        familyText.className = "footer-text"
        familyLink.appendChild(familyText)


        buttons.append(aboutBtn, communityBtn, resourceBtn, legalBtn, familyBtn)

        footer.appendChild(logo);
        footer.appendChild(buttons);

        return footer;
    }

    function newsButtonClicked() {
        newsBox.querySelector(".box-content").replaceWith(newsContent);
        newsContent.classList += " news-box-content"
        newsContent.querySelectorAll("li").forEach((element) => {
            element.classList += "news-li "
    let newsContent;
        })
    }

    function whatshappeningButtonClicked() {
        newsBox.querySelector(".box-content").replaceWith(whatshappeningContent);
    }

    function featuredstudiosButtonClicked() {
        blueBoxContent.replaceChildren(featuredStudiosContent) 
    }

    function featuredProjectsButtonClicked() {
        blueBoxContent.replaceChildren(featuredProjectsContent)
    }


    const activityBox = document.querySelector("#view > div > div:nth-child(1) > div.splash-header > div.box.activity")
    const newsBox = document.querySelector("#view > div > div:nth-child(1) > div.splash-header > div.box.news")

    let blueBoxContent = null;

    let whatshappeningContent;
    let featuredProjectsContent;
    let featuredStudiosContent;

    if(activityBox && newsBox) {
        const userEl = document.querySelector("#navigation .account-nav .user-info .profile-name, #navigation > div > ul > li.link.right.account-nav span");
        const username = userEl?.textContent?.trim() || null;
        console.log("Both found.")

        
        //class to identify them
        activityBox.classList += " injected-top-box"
        newsBox.classList += " injected-top-box"

        //remove header content
        activityBox.querySelector("h4").remove()
        newsBox.querySelector("h4").remove()
        newsBox.querySelector("p").remove()

        //get headers
        const activityHeader = activityBox.querySelector("div.box-header");
        const newsHeader = newsBox.querySelector("div.box-header");
        
        //add btns to headers
        generateBtn("Dashboard", "dashboard-btn", "tab-btn selected", activityHeader);

        generateBtn("What's Happening?", "whatshappening-btn", "tab-btn selected", newsHeader, whatshappeningButtonClicked);
        generateBtn("Scratch News", "news-btn", "tab-btn", newsHeader, newsButtonClicked);

        const dashboardContent = generateDashboardTab();
        activityBox.querySelector(".box-content").replaceWith(dashboardContent)

        
        newsContent = newsBox.querySelector(".box-content");
        
        initWhatsHappening = generateWhatsHappening().then(whatshappeningDiv => {
            newsBox.querySelector(".box-content").replaceWith(whatshappeningDiv);
            whatshappeningContent = whatshappeningDiv;
        });


        //remove next/last page btns
        document.querySelectorAll(".slick-arrow").forEach((element) => {
            element.remove()
        })
        
        // BLUE BOX WITH FEATURED PROJECTS & STUDIOS
        blueBoxContent = document.querySelectorAll('.box-content')[1]
        const blueBox = blueBoxContent.parentElement;
        const blueBoxHeader = blueBox.querySelector('.box-header');
        blueBox.classList += " blue-box"
        blueBoxHeader.classList += " blue-box-header";
        blueBoxContent.classList = " blue-box-content";

        document.querySelector('#view > div > div:nth-child(1) > div:nth-child(3)').remove()

        blueBoxHeader.querySelector('h4').remove()
        generateBtn("Featured Projects", "featured-projects",  "tab-btn", blueBoxHeader, featuredProjectsButtonClicked)
        generateBtn("Featured Studios", "featured-studios",  "tab-btn", blueBoxHeader, featuredstudiosButtonClicked)
        
        featuredProjectsContent = await generateFeaturedProjects(blueBoxContent);
        featuredStudiosContent = generateFeaturedStudios(blueBoxContent);
        const projectsLovedByScratchersImFollowing = generateProjectsLovedByScratchersImFollowing(username);
        const designStudio = generateDesignStudio(); 

        //remove footer
        const newFooter = generateNewFooter();
        document.getElementById("footer").replaceWith(newFooter)

        return true;
    } else {
        console.log("Not found")
        return null;
    }
}

fetchAllProjects();
fetchUserData();

let isInjecting = false;

const observer = new MutationObserver(async (mutations) => {
    if (isInjecting) return;
    isInjecting = true;
    const success = await tryInjectingBoxes()
    if (success) {
        observer.disconnect()
    } else {
        isInjecting = false;
    };
})

observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
})