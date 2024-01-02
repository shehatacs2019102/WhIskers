import React, { Component } from 'react';
    import '../styles/Card.css';
    import catpic from '../assets/cat-instagram-captions-64ff2dfa47e9a.jpg';

    function Home(props) {
        
        return (
            <div className="content">
                <img src={catpic} alt="photo" />
                <div className="text"><p>expert cats are likperts   are likperts expert cats are likperts syour are likperts expert cats are likperts syourexpert cats are likperts syourexpert cats are likperts syourexpert cats are likperts syourexpert cats are likperts syourexpert cats are likperts syourexpert cats are likperts syourexpert cats are likperts syourexpert cats are likperts syoursyour </p> </div>
                <button>read more</button>
            </div>
        );
    }
    
    export default Home;