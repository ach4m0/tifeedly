/**
 * tifeedly provides a Javascript-friendly interface to your feedly account
 * without other dependencies. Ports of node-feedly library
 *
 * @class TiFeedly
 */
(function() {
	 /*
	 * Constants
	 */
	var BASE_URL = 'http://sandbox.feedly.com/v3',
	    AUTH_URL = BASE_URL + '/auth/auth',
	    TOKEN_URL = BASE_URL + '/auth/token',
	    MARKERS = BASE_URL + '/markers',
	    LATEST_READS = BASE_URL + '/markers/reads',
	    GET_UNREAD_COUNTS = BASE_URL + '/markers/counts',
	    GET_SUBSCRIPTIONS = BASE_URL + '/subscriptions',
	    GET_CATEGORIES = BASE_URL + '/categories',
	    TiFeedly = null;
	
	module.exports = TiFeedly = (function(){
		var that;
	    /**
	     * Creates an instance of the TiFeedly class
	     * @constructor
	     * @param {String} client_id String with client_id in Feedly Cloud
	     * @param {String} client_secret String with client_secret in Feedly Cloud
	     */
	    function TiFeedly(client_id, client_secret){
	        if(client_id == null || client_secret == null){
	            return null;
	        }
	        this.client_id = client_id;
	        this.client_secret = client_secret;
	        this.code = null;
	        this.access_token = null;
	        this.refresh_token = null;
	        this.expires = null;
	        this.expiration_min = 3600000; // milliseconds
	        that = this;
	    }
	
	    // ====== PRIVATE METHODS ======
	
	    /**
	     * Request token to access to Feedly Cloud
	     * @method _access
	     * @return {Bool} true or false
	     */
	    TiFeedly.prototype._access = function(){
	        if(that.code == null){
	            return that._auth();
	        }else{
	            if(that.access_token == null || that.refresh_token == null){
	                that._request(
	                    TOKEN_URL,
	                    'POST',
	                    {
	                        code: that.code,
	                        client_id: that.client_id,
	                        client_secret: that.client_secret,
	                        grant_type: 'authorization_code',
	                        redirect_uri: 'http://localhost'
	                    },
	                    false,
	                    function(response){
	                    	if(response.error){
								console.log("HA OCURRIDO UN ERROR");
	                    	}else{
	                    		var responseObject = JSON.parse(response);
	                    		that.access_token=responseObject.access_token;
	                    		that.refresh_token=responseObject.refresh_token;
	                    		that.expires = new Date(new Date().getTime() + (responseObject.expires_in * 1000));
	                    	}
	                    }
	                );
	            }
	        }
	    };
	
	    /**
	     * Execute authentication in Feedly Cloud.
	     * If code element is not null execute _access method
	     * @method _auth
	     * @return {Bool} true or false
	     */
	    TiFeedly.prototype._auth = function(){
	        if(that.code == null){
	        	var window = Ti.UI.createWindow({modal: true}),
	        		webview = Ti.UI.createWebView(),
	        		url = AUTH_URL + '?',
	        		data = {
	                    response_type: 'code',
	                    client_id: that.client_id,
	                    redirect_uri: 'http://localhost',
	                    scope: 'https://cloud.feedly.com/subscriptions'
	               	};
	                Object.keys(data).forEach(function(key){
	                    url = url + encodeURIComponent(key) + '='
	                        + encodeURIComponent(data[key]) + '&';
	                });
	                webview.setUrl(url);
	                webview.addEventListener('error',function(event){
	                	if(event.url.indexOf('http://localhost') == 0 ){
	                		window.close();
	                		delete(window);
							var params = event.url.split('?')[1].split('&');
							for (var i=0; i<params.length; i++) {
								var paramSplited = params[i].split('=');
								if(paramSplited[0] == 'code'){
							  		that.code=paramSplited[1];
							  		return that._access();
							  	}
							};
	                	}else{
	                		window.close();
	                		delete(window);
	                		return false;
	                	}
	                });
	                window.add(webview);
	                window.open({modal: true});
			}else{
	            return that._access();
	        }
	    };
	
	    /**
	     * Request refresh tokens to access to Feedly Cloud
	     * @method _refresh
	     * @return {Bool} true or false
	     */
	    TiFeedly.prototype._refresh = function(){
	        if(that.code == null){
	            return that._auth();
	        }else{
	            if(that.refresh_token != null){
	            	that._request(
	                    TOKEN_URL,
	                    'POST',
	                    {
	                        refresh_token: that.refresh_token,
	                        client_id: that.client_id,
	                        client_secret: that.client_secret,
	                        grant_type: 'refresh_token'
	                    },
	                    false,
	                    function(response){
	                    	if(response.error){
								console.log("HA OCURRIDO UN ERROR");
	                    	}else{
	                    		var responseObject = JSON.parse(response);
	                    		that.access_token=responseObject.access_token;
	                    		that.expires = new Date(new Date().getTime() + (responseObject.expires_in * 1000));
	                    	}
	                    }
	                );
	            }else{
	                return that._access();
	            }
	        }
	    };
	
	    /**
	     * Generic method to execute http request to Feedly Cloud
	     * @method _request
	     * @param {String} url Path to feedly cloud
	     * @param {String} method Method to call feedly (GET, POST, DELETE)
	     * @param {Object} data Object with parameters to url
	     * @param {Bool} oauth true or false if you need header oauth
	     * @param {Function} callback Function to execute when call has finished
	     * @return {Bool} true or false
	     */
	    TiFeedly.prototype._request = function(url, method, data, oauth, callback){
	        if(method == null){
	            method = 'GET';
	        }
	        if(oauth == null){
	            oauth = false;
	        }
	        if(url != null){
	            var client = Ti.Network.createHTTPClient({
	                onload: function(response){
	                    if (callback != null) {
	                        return callback(this.responseText);
	                    } else {
	                        return this.responseText;
	                    }
	                },
	                onerror: function(response){
	                    if (callback != null) {
	                        return callback(response);
	                    } else {
	                        return response;
	                    }
	                },
	                timeout: 10000
	            });
	            if(method != 'POST' && data != null){
	                url = url + '?';
	                Object.keys(data).forEach(function(key){
	                    url = url + encodeURIComponent(key) + '='
	                        + encodeURIComponent(data[key]) + '&';
	                });
	            }
	            client.open(method,url);
	            if(oauth){
	                client.setRequestHeader('Authorization','OAuth ' + that.access_token);
	            }
	            // console.log("Ejecutando http request:");
	            // console.log("    URL: " + url);
	            // console.log("    METHOD: " + method);
	            // console.log("    DATA: ");
				// Object.keys(data).forEach(function(key){
	                // console.log(key + " : " + data[key]);
	            // });
	            if(method == 'POST'){
	                client.send(data);
	            }else{
	            	client.send();
	            }
	        }
	    };
	
	    /**
	     * Return true or false if exist a valid expiration date
	     * @method _validExpiration
	     * @return {Bool} true or false if exist a valid expiration date
	     */
	    TiFeedly.prototype._validExpiration = function(){
	        return (that.expires != null) && (that.expires > new Date()) && ((that.expires - new Date()) < that.expiration_min);
	    };
	
	    /**
	     * Return true or false if exist a valid access and refresh token
	     * @method _validToken
	     * @return {Bool} true or false if exist a valid access and refresh token
	     */
	    TiFeedly.prototype._validToken = function(){
	        return (that.access_token != null) && (that.refresh_token != null);
	    };
	
	
	
	    // ====== PUBLIC METHODS ======
	
	    /**
	     * Public method to start login process
	     * @method login
	     * @return {Bool} true or false
	     */
	    TiFeedly.prototype.login = function(){
	    	if(! that._validToken()){
	            return that._auth();
	        }else if(! that._validExpiration()){
	            return that._refresh();
	        }else{
	            return true;
	        }
	    };
	    
	    /**
	     * Public method to logout
	     * @method logout
	     * @return {Bool} true or false
	     */
	    TiFeedly.prototype.logout = function(){
	        /* Igual que access pero distinto grant_type */
	        that.code = null;
	        that.access_token = null;
	        that.refresh_token = null;
	        that.expires = null;
	    };
	
	    /**
	     * Public method to refresh access token
	     * @method refresh
	     * @return {Bool} true or false
	     */
	    TiFeedly.prototype.refresh = function(){
	        if (!that._validExpiration()){
	            return that._refresh();
	        }else{
	            return true;
	        }
	    };
	    
	    /**
	     * Function to do requests to feedly
	     */
	    TiFeedly.prototype._doRequest = function(url, method, data, cb){
	    	if(data != null)
	    		data = JSON.stringify(data);
	    	if(url != null){
	    		that._request(
	    			url,
	    			method,
	    			data,
	    			true,
	    			function(response){
	                	if(response.error){
							console.error("ERROR: " + response.error);
	                	}else{
	                		var responseObject = JSON.parse(response);
	                		if(cb != null){
	                			return cb(responseObject);
	                		}else{
	                			return responseObject;
	                		}
	                	}
	                }
				);
	    	}
	    };
	    
	    /**
	     * Get the latest read operations (to sync local cache)
	     */
	    TiFeedly.prototype.reads = function(callback){
	    	return that._doRequest(LATEST_READS, 'GET', null, callback);
	    };
	    
	    /**
	     * Get the user's subscriptions
	     */
	    TiFeedly.prototype.getSubscriptions = function(callback){
	    	return that._doRequest(GET_SUBSCRIPTIONS, 'GET', null, callback);
	    };
	    
	    /**
	     * Get the user's categories
	     */
	    TiFeedly.prototype.getCategories = function(callback){
	    	return that._doRequest(GET_CATEGORIES, 'GET', null, callback);
	    };
	    
	    /**
	     * Get the list of unread counts
	     */
	    TiFeedly.prototype.getUnreadCounts = function(callback){
	    	return that._doRequest(GET_UNREAD_COUNTS, 'GET', null, callback);
	    };
	    
	    /**
	     * Mark one or multiple articles as read
	     */
	    TiFeedly.prototype.markEntryAsRead = function(entries,callback){
	    	// Check entries as array
	    	if(Array.isArray(entries)){
	    		// Generate data
		    	var data = {
		    		action: "markAsRead",
		    		type: "entries",
		    		entryIds: entries
		    	};
		    	return that._doRequest(MARKERS, 'POST', data, callback);
	    	}else{
	    		return callback(JSON.stringify({error: 'Entries parameter is not array'}));
	    	}
	    };
	    
	    /**
	     * Keep one or multiple articles as unread
	     */
	    TiFeedly.prototype.keepEntryUnread = function(entries,callback){
	    	// Check entries as array
	    	if(Array.isArray(entries)){
	    		// Generate data
		    	var data = {
		    		action: "keepUnread",
		    		type: "entries",
		    		entryIds: entries
		    	};
		    	return that._doRequest(MARKERS, 'POST', data, callback);
	    	}else{
	    		return callback(JSON.stringify({error: 'Entries parameter is not array'}));
	    	}
	    };
	    
	    /**
	     * Mark one feed as read
	     * 
	     * STATUS PENDING
	     */
	    TiFeedly.prototype.markFeedAsRead = function(feeds,callback){
	    	// Check entries as array
	    	if(Array.isArray(feeds)){
	    		// Generate data
		    	var data = {
		    		action: "markAsRead",
		    		type: "feeds",
		    		feedIds: feeds
		    	};
		    	return that._doRequest(MARKERS, 'POST', data, callback);
	    	}else{
	    		return callback(JSON.stringify({error: 'Feeds parameter is not array'}));
	    	}
	    };
	    
	    /**
	     * Mark a category as read
	     * 
	     * STATUS PENDING
	     */
	    TiFeedly.prototype.markCategoryAsRead = function(categories,callback){
	    	// Check entries as array
	    	if(Array.isArray(feeds)){
	    		// Generate data
		    	var data = {
		    		action: "markAsRead",
		    		type: "categories",
		    		categoryIds: categories
		    	};
		    	return that._doRequest(MARKERS, 'POST', data, callback);
	    	}else{
	    		return callback(JSON.stringify({error: 'Categories parameter is not array'}));
	    	}
	    };
	    
	    /** 
	     * Undo mark as read
	     * 
	     * STATUS PENDING
	     */
	    TiFeedly.prototype.undoMarkAsRead = function(categories,callback){
	    	// Check entries as array
	    	if(Array.isArray(categories)){
	    		// Generate data
		    	var data = {
		    		action: "undoMarkAsRead",
		    		type: "categories",
		    		categoryIds: categories
		    	};
		    	return that._doRequest(MARKERS, 'POST', data, callback);
	    	}else{
	    		return callback(JSON.stringify({error: 'Categories parameter is not array'}));
	    	}
	    };
	    
	    /**
	     * Mark one or multiple articles as saved
	     * 
	     */
	    TiFeedly.prototype.markAsSaved = function(entries,callback){
	    	// Check entries as array
	    	if(Array.isArray(entries)){
	    		// Generate data
		    	var data = {
		    		action: "markAsSaved",
		    		type: "entries",
		    		entryIds: entries
		    	};
		    	return that._doRequest(MARKERS, 'POST', data, callback);
	    	}else{
	    		return callback(JSON.stringify({error: 'Entries parameter is not array'}));
	    	}
	    };
	    
	    /**
	     * Mark one or multiple articles as unsaved
	     * 
	     */
	    TiFeedly.prototype.markAsUnsaved = function(entries,callback){
	    	// Check entries as array
	    	if(Array.isArray(entries)){
	    		// Generate data
		    	var data = {
		    		action: "markAsUnsaved",
		    		type: "entries",
		    		entryIds: entries
		    	};
		    	return that._doRequest(MARKERS, 'POST', data, callback);
	    	}else{
	    		return callback(JSON.stringify({error: 'Entries parameter is not array'}));
	    	}
	    };
	    
	    
	    return TiFeedly;
	    
	})();	
}).call(this);
