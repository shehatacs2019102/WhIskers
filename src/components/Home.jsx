import React, { Component } from 'react';
import '../styles/Home.css';
import Card from './Card';
import holdingcat from '../assets/beautiful-young-woman-holding-cat-white_392895-22650.png'
    function Home(props) {
        
        return (
            <div className="home">
                  <div className="home-top">
                    <img src={holdingcat} alt="" />
                </div>  
                <div className="cards">

                <Card/>
                <Card/>
                <Card/>
                <Card/>
                <Card/>
                <Card/>
                <Card/>
                <Card/>

                </div>
                
                

            </div>
        );
    }
    
    export default Home;